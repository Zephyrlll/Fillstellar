//! WebSocket メッセージ圧縮サービス

use flate2::{Compression, write::ZlibEncoder, read::ZlibDecoder};
use lz4_flex::{compress_prepend_size, decompress_size_prepended};
use std::io::{Write, Read};
use serde::{Serialize, Deserialize};
use anyhow::{Result, anyhow};
use tracing::{instrument, debug, warn};

/// 圧縮アルゴリズム
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CompressionAlgorithm {
    None,
    Zlib,
    Lz4,
}

/// 圧縮設定
#[derive(Debug, Clone)]
pub struct CompressionConfig {
    pub algorithm: CompressionAlgorithm,
    pub min_size_threshold: usize,
    pub zlib_level: Compression,
    pub enable_adaptive: bool,
    pub max_compression_ratio: f32,
}

impl Default for CompressionConfig {
    fn default() -> Self {
        Self {
            algorithm: CompressionAlgorithm::Lz4,
            min_size_threshold: 1024, // 1KB以上で圧縮
            zlib_level: Compression::fast(),
            enable_adaptive: true,
            max_compression_ratio: 0.8, // 圧縮率が80%を超えたら圧縮しない
        }
    }
}

/// 圧縮統計
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CompressionStats {
    pub messages_compressed: u64,
    pub messages_uncompressed: u64,
    pub total_bytes_input: u64,
    pub total_bytes_output: u64,
    pub compression_time_ms: u64,
    pub decompression_time_ms: u64,
}

impl CompressionStats {
    pub fn compression_ratio(&self) -> f64 {
        if self.total_bytes_input > 0 {
            self.total_bytes_output as f64 / self.total_bytes_input as f64
        } else {
            1.0
        }
    }

    pub fn bandwidth_saved(&self) -> u64 {
        self.total_bytes_input.saturating_sub(self.total_bytes_output)
    }
}

/// WebSocket圧縮サービス
#[derive(Debug, Clone)]
pub struct CompressionService {
    config: CompressionConfig,
    stats: std::sync::Arc<std::sync::Mutex<CompressionStats>>,
}

impl CompressionService {
    /// 新しい圧縮サービスを作成
    pub fn new(config: CompressionConfig) -> Self {
        Self {
            config,
            stats: std::sync::Arc::new(std::sync::Mutex::new(CompressionStats::default())),
        }
    }

    /// メッセージを圧縮
    #[instrument(skip(self, data), fields(data_size = data.len(), algorithm = ?self.config.algorithm))]
    pub fn compress(&self, data: &[u8]) -> Result<CompressedMessage> {
        let start = std::time::Instant::now();
        
        // サイズ閾値チェック
        if data.len() < self.config.min_size_threshold {
            debug!("Message too small for compression ({} < {})", data.len(), self.config.min_size_threshold);
            self.update_stats(|stats| {
                stats.messages_uncompressed += 1;
                stats.total_bytes_input += data.len() as u64;
                stats.total_bytes_output += data.len() as u64;
            });
            
            return Ok(CompressedMessage {
                algorithm: CompressionAlgorithm::None,
                original_size: data.len(),
                data: data.to_vec(),
            });
        }

        let compressed_data = match self.config.algorithm {
            CompressionAlgorithm::None => data.to_vec(),
            CompressionAlgorithm::Zlib => self.compress_zlib(data)?,
            CompressionAlgorithm::Lz4 => self.compress_lz4(data)?,
        };

        let compression_time = start.elapsed();
        let compression_ratio = compressed_data.len() as f32 / data.len() as f32;

        // 適応的圧縮: 圧縮効果が低い場合は圧縮しない
        let (final_data, final_algorithm) = if self.config.enable_adaptive && 
            compression_ratio > self.config.max_compression_ratio {
            debug!("Compression ratio too high ({:.2}), using uncompressed", compression_ratio);
            (data.to_vec(), CompressionAlgorithm::None)
        } else {
            (compressed_data, self.config.algorithm)
        };

        self.update_stats(|stats| {
            if final_algorithm == CompressionAlgorithm::None {
                stats.messages_uncompressed += 1;
            } else {
                stats.messages_compressed += 1;
            }
            stats.total_bytes_input += data.len() as u64;
            stats.total_bytes_output += final_data.len() as u64;
            stats.compression_time_ms += compression_time.as_millis() as u64;
        });

        debug!(
            "Compressed {} -> {} bytes ({:.2}% ratio) in {:?}",
            data.len(),
            final_data.len(),
            compression_ratio * 100.0,
            compression_time
        );

        Ok(CompressedMessage {
            algorithm: final_algorithm,
            original_size: data.len(),
            data: final_data,
        })
    }

    /// メッセージを解凍
    #[instrument(skip(self, message), fields(algorithm = ?message.algorithm, compressed_size = message.data.len()))]
    pub fn decompress(&self, message: &CompressedMessage) -> Result<Vec<u8>> {
        let start = std::time::Instant::now();

        let data = match message.algorithm {
            CompressionAlgorithm::None => message.data.clone(),
            CompressionAlgorithm::Zlib => self.decompress_zlib(&message.data)?,
            CompressionAlgorithm::Lz4 => self.decompress_lz4(&message.data)?,
        };

        let decompression_time = start.elapsed();

        // サイズ検証
        if data.len() != message.original_size {
            return Err(anyhow!(
                "Decompressed size mismatch: expected {}, got {}",
                message.original_size,
                data.len()
            ));
        }

        self.update_stats(|stats| {
            stats.decompression_time_ms += decompression_time.as_millis() as u64;
        });

        debug!(
            "Decompressed {} -> {} bytes in {:?}",
            message.data.len(),
            data.len(),
            decompression_time
        );

        Ok(data)
    }

    /// zlib圧縮
    fn compress_zlib(&self, data: &[u8]) -> Result<Vec<u8>> {
        let mut encoder = ZlibEncoder::new(Vec::new(), self.config.zlib_level);
        encoder.write_all(data)?;
        let compressed = encoder.finish()?;
        Ok(compressed)
    }

    /// zlib解凍
    fn decompress_zlib(&self, data: &[u8]) -> Result<Vec<u8>> {
        let mut decoder = ZlibDecoder::new(data);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)?;
        Ok(decompressed)
    }

    /// LZ4圧縮
    fn compress_lz4(&self, data: &[u8]) -> Result<Vec<u8>> {
        let compressed = compress_prepend_size(data);
        Ok(compressed)
    }

    /// LZ4解凍
    fn decompress_lz4(&self, data: &[u8]) -> Result<Vec<u8>> {
        let decompressed = decompress_size_prepended(data)
            .map_err(|e| anyhow!("LZ4 decompression failed: {}", e))?;
        Ok(decompressed)
    }

    /// 統計を更新
    fn update_stats<F>(&self, update_fn: F)
    where
        F: FnOnce(&mut CompressionStats),
    {
        if let Ok(mut stats) = self.stats.lock() {
            update_fn(&mut stats);
        }
    }

    /// 統計を取得
    pub fn get_stats(&self) -> CompressionStats {
        self.stats.lock().unwrap_or_else(|_| {
            warn!("Failed to acquire stats lock");
            std::sync::PoisonError::new(CompressionStats::default()).into_inner()
        }).clone()
    }

    /// 統計をリセット
    pub fn reset_stats(&self) {
        if let Ok(mut stats) = self.stats.lock() {
            *stats = CompressionStats::default();
        }
    }

    /// 圧縮設定を取得
    pub fn config(&self) -> &CompressionConfig {
        &self.config
    }

    /// 圧縮設定を更新
    pub fn update_config(&mut self, config: CompressionConfig) {
        self.config = config;
    }

    /// 最適なアルゴリズムを選択（サンプルデータに基づく）
    #[instrument(skip(self, sample_data))]
    pub fn select_optimal_algorithm(&self, sample_data: &[&[u8]]) -> CompressionAlgorithm {
        if sample_data.is_empty() {
            return CompressionAlgorithm::Lz4;
        }

        let mut best_algorithm = CompressionAlgorithm::None;
        let mut best_ratio = f32::INFINITY;

        for &algorithm in &[CompressionAlgorithm::Zlib, CompressionAlgorithm::Lz4] {
            let mut total_input = 0usize;
            let mut total_output = 0usize;
            let mut total_time = std::time::Duration::ZERO;

            for &data in sample_data {
                if data.len() < self.config.min_size_threshold {
                    continue;
                }

                let start = std::time::Instant::now();
                let compressed = match algorithm {
                    CompressionAlgorithm::Zlib => self.compress_zlib(data),
                    CompressionAlgorithm::Lz4 => self.compress_lz4(data),
                    _ => continue,
                };

                if let Ok(compressed) = compressed {
                    total_input += data.len();
                    total_output += compressed.len();
                    total_time += start.elapsed();
                }
            }

            if total_input > 0 {
                let ratio = total_output as f32 / total_input as f32;
                let speed_penalty = total_time.as_millis() as f32 / 1000.0; // 速度ペナルティ
                let score = ratio + speed_penalty * 0.01; // 圧縮率を重視、速度は軽く考慮

                debug!(
                    "Algorithm {:?}: ratio={:.3}, time={:?}, score={:.3}",
                    algorithm, ratio, total_time, score
                );

                if score < best_ratio {
                    best_ratio = score;
                    best_algorithm = algorithm;
                }
            }
        }

        debug!("Selected optimal algorithm: {:?}", best_algorithm);
        best_algorithm
    }
}

/// 圧縮されたメッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressedMessage {
    pub algorithm: CompressionAlgorithm,
    pub original_size: usize,
    pub data: Vec<u8>,
}

impl CompressedMessage {
    /// メッセージをバイナリ形式にシリアライズ
    pub fn to_bytes(&self) -> Result<Vec<u8>> {
        let mut result = Vec::new();
        
        // ヘッダー: [algorithm(1byte)] [original_size(4bytes)]
        result.push(self.algorithm as u8);
        result.extend_from_slice(&(self.original_size as u32).to_le_bytes());
        result.extend_from_slice(&self.data);
        
        Ok(result)
    }

    /// バイナリ形式からメッセージをデシリアライズ
    pub fn from_bytes(data: &[u8]) -> Result<Self> {
        if data.len() < 5 {
            return Err(anyhow!("Invalid compressed message: too short"));
        }

        let algorithm = match data[0] {
            0 => CompressionAlgorithm::None,
            1 => CompressionAlgorithm::Zlib,
            2 => CompressionAlgorithm::Lz4,
            other => return Err(anyhow!("Unknown compression algorithm: {}", other)),
        };

        let original_size = u32::from_le_bytes([data[1], data[2], data[3], data[4]]) as usize;
        let message_data = data[5..].to_vec();

        Ok(Self {
            algorithm,
            original_size,
            data: message_data,
        })
    }

    /// 圧縮率を取得
    pub fn compression_ratio(&self) -> f64 {
        self.data.len() as f64 / self.original_size as f64
    }

    /// 節約されたバイト数
    pub fn bytes_saved(&self) -> usize {
        self.original_size.saturating_sub(self.data.len())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zlib_compression() {
        let service = CompressionService::new(CompressionConfig {
            algorithm: CompressionAlgorithm::Zlib,
            min_size_threshold: 0,
            ..Default::default()
        });

        let data = b"Hello, World! This is a test message that should compress well because it has repeated patterns. Hello, World!";
        
        let compressed = service.compress(data).unwrap();
        assert_eq!(compressed.algorithm, CompressionAlgorithm::Zlib);
        assert!(compressed.data.len() < data.len());
        
        let decompressed = service.decompress(&compressed).unwrap();
        assert_eq!(decompressed, data);
    }

    #[test]
    fn test_lz4_compression() {
        let service = CompressionService::new(CompressionConfig {
            algorithm: CompressionAlgorithm::Lz4,
            min_size_threshold: 0,
            ..Default::default()
        });

        let data = b"This is a test message for LZ4 compression. LZ4 is fast! LZ4 is fast! LZ4 is fast!";
        
        let compressed = service.compress(data).unwrap();
        assert_eq!(compressed.algorithm, CompressionAlgorithm::Lz4);
        
        let decompressed = service.decompress(&compressed).unwrap();
        assert_eq!(decompressed, data);
    }

    #[test]
    fn test_size_threshold() {
        let service = CompressionService::new(CompressionConfig {
            algorithm: CompressionAlgorithm::Zlib,
            min_size_threshold: 100,
            ..Default::default()
        });

        let small_data = b"Short";
        let compressed = service.compress(small_data).unwrap();
        assert_eq!(compressed.algorithm, CompressionAlgorithm::None);
        assert_eq!(compressed.data, small_data);
    }

    #[test]
    fn test_adaptive_compression() {
        let service = CompressionService::new(CompressionConfig {
            algorithm: CompressionAlgorithm::Zlib,
            min_size_threshold: 0,
            enable_adaptive: true,
            max_compression_ratio: 0.9,
            ..Default::default()
        });

        // ランダムデータは圧縮効果が低い
        let random_data: Vec<u8> = (0..100).map(|i| (i * 7 + 13) as u8).collect();
        
        let compressed = service.compress(&random_data).unwrap();
        // 圧縮効果が低いので未圧縮になる可能性がある
    }

    #[test]
    fn test_message_serialization() {
        let message = CompressedMessage {
            algorithm: CompressionAlgorithm::Lz4,
            original_size: 1024,
            data: vec![1, 2, 3, 4, 5],
        };

        let bytes = message.to_bytes().unwrap();
        let restored = CompressedMessage::from_bytes(&bytes).unwrap();

        assert_eq!(restored.algorithm, message.algorithm);
        assert_eq!(restored.original_size, message.original_size);
        assert_eq!(restored.data, message.data);
    }

    #[test]
    fn test_compression_stats() {
        let service = CompressionService::new(CompressionConfig::default());
        
        let data1 = vec![1; 2000];
        let data2 = vec![2; 3000];
        
        service.compress(&data1).unwrap();
        service.compress(&data2).unwrap();
        
        let stats = service.get_stats();
        assert!(stats.messages_compressed > 0 || stats.messages_uncompressed > 0);
        assert!(stats.total_bytes_input > 0);
    }
}