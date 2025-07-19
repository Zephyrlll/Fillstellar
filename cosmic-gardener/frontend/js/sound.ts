import * as THREE from 'three';
import { gameState } from './state.js';

interface SoundSettings {
    masterVolume: number;
    ambientVolume: number;
    effectsVolume: number;
    uiVolume: number;
    spatialAudio: boolean;
    muted: boolean;
}

interface SoundNode {
    source: AudioBufferSourceNode | OscillatorNode;
    gainNode: GainNode;
    pannerNode?: PannerNode;
}

class SoundManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private ambientGain: GainNode | null = null;
    private effectsGain: GainNode | null = null;
    private uiGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private reverb: ConvolverNode | null = null;
    
    private ambientNodes: Map<string, SoundNode> = new Map();
    private activeEffects: Map<string, SoundNode> = new Map();
    
    private settings: SoundSettings = {
        masterVolume: 0.7,
        ambientVolume: 0.6,
        effectsVolume: 0.8,
        uiVolume: 0.5,
        spatialAudio: true,
        muted: false
    };

    private listener: AudioListener | null = null;
    public initialized: boolean = false;

    constructor() {
        this.loadSettings();
    }

    async init(listener?: AudioListener): Promise<void> {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // マスターボリューム
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
            
            // コンプレッサー（音量の均一化）
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            // カテゴリ別ゲインノード
            this.ambientGain = this.audioContext.createGain();
            this.ambientGain.gain.value = this.settings.ambientVolume;
            
            this.effectsGain = this.audioContext.createGain();
            this.effectsGain.gain.value = this.settings.effectsVolume;
            
            this.uiGain = this.audioContext.createGain();
            this.uiGain.gain.value = this.settings.uiVolume;
            
            // リバーブ（宇宙空間の広がり）
            this.reverb = this.audioContext.createConvolver();
            await this.createSpaceReverb();
            
            // 接続
            this.ambientGain.connect(this.reverb);
            this.effectsGain.connect(this.compressor);
            this.uiGain.connect(this.compressor);
            this.reverb.connect(this.compressor);
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            if (listener) {
                this.listener = listener;
            }
            
            this.initialized = true;
            
            // アンビエントサウンドを開始
            this.startAmbientSpace();
            
        } catch (error) {
            console.warn('サウンドシステムの初期化に失敗しました:', error);
        }
    }

    private async createSpaceReverb(): Promise<void> {
        if (!this.audioContext || !this.reverb) return;
        
        // 宇宙空間のリバーブインパルスレスポンスを生成
        const length = this.audioContext.sampleRate * 4; // 4秒のリバーブ
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // 宇宙空間の反響をシミュレート
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay * 0.05;
                
                // 時々エコーを追加
                if (i % 10000 === 0) {
                    channelData[i] += (Math.random() * 2 - 1) * decay * 0.1;
                }
            }
        }
        
        this.reverb.buffer = impulse;
    }

    private startAmbientSpace(): void {
        if (!this.audioContext || !this.ambientGain) return;
        
        // インターステラー風の壮大なアンビエント
        this.createCosmicOrchestra();
        
        // 時空の歪みと重力の響き
        this.createSpacetimeResonance();
        
        // 星々の囁きと宇宙の呼吸
        this.createCelestialWhispers();
        
        // 神聖な宇宙のドローン
        this.createDivineSpaceDrone();
        
        // 時の流れの音
        this.createTemporalEcho();
    }

    // インターステラー風の宇宙オーケストラ
    private createCosmicOrchestra(): void {
        if (!this.audioContext || !this.ambientGain) return;
        
        // 基音のオーケストラハーモニー (C major 7th)
        const frequencies = [65.4, 82.4, 98.0, 130.8, 164.8]; // C2, E2, G2, C3, E3
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext!.createOscillator();
            const gain = this.audioContext!.createGain();
            const filter = this.audioContext!.createBiquadFilter();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = freq;
            
            filter.type = 'lowpass';
            filter.frequency.value = 300 + index * 100;
            filter.Q.value = 8;
            
            // 各音の音量を調整（低音を強く、高音を弱く）
            gain.gain.value = 0.08 / (index + 1);
            
            // ゆっくりとした周波数変調で「呼吸」感を演出
            const lfo = this.audioContext!.createOscillator();
            const lfoGain = this.audioContext!.createGain();
            lfo.frequency.value = 0.05 + index * 0.01; // わずかにずらす
            lfoGain.gain.value = 0.5;
            
            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);
            
            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.ambientGain!);
            
            oscillator.start();
            lfo.start();
            
            this.ambientNodes.set(`orchestra_${index}`, {
                source: oscillator,
                gainNode: gain
            });
        });
    }

    // 時空の歪みと重力の響き
    private createSpacetimeResonance(): void {
        if (!this.audioContext || !this.ambientGain) return;
        
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const delay = this.audioContext.createDelay(1.0);
        const feedback = this.audioContext.createGain();
        
        // 重力波をイメージした微妙なビート
        oscillator1.type = 'sine';
        oscillator1.frequency.value = 40;
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 40.5; // わずかなずれでビート効果
        
        filter.type = 'bandpass';
        filter.frequency.value = 80;
        filter.Q.value = 15;
        
        delay.delayTime.value = 0.3;
        feedback.gain.value = 0.4;
        
        gain.gain.value = 0.04;
        
        // 時間とともにゆっくりと変化する重力場
        const gravityLfo = this.audioContext.createOscillator();
        const gravityLfoGain = this.audioContext.createGain();
        gravityLfo.frequency.value = 0.02; // 50秒周期
        gravityLfoGain.gain.value = 2;
        
        gravityLfo.connect(gravityLfoGain);
        gravityLfoGain.connect(filter.frequency);
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay); // フィードバックループ
        filter.connect(gain);
        delay.connect(gain);
        gain.connect(this.ambientGain);
        
        oscillator1.start();
        oscillator2.start();
        gravityLfo.start();
        
        this.ambientNodes.set('spacetime', {
            source: oscillator1,
            gainNode: gain
        });
    }

    // 星々の囁きと宇宙の呼吸
    private createCelestialWhispers(): void {
        if (!this.audioContext || !this.ambientGain) return;
        
        const createWhisper = () => {
            if (!this.audioContext || !this.ambientGain) return;
            
            // 星の誕生をイメージした美しい音
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            const delay = this.audioContext.createDelay(0.5);
            
            // 美しいハーモニー（完全5度）
            const baseFreq = 200 + Math.random() * 300;
            oscillator1.type = 'triangle';
            oscillator1.frequency.value = baseFreq;
            oscillator2.type = 'sine';
            oscillator2.frequency.value = baseFreq * 1.5; // 完全5度
            
            filter.type = 'highpass';
            filter.frequency.value = 150;
            filter.Q.value = 2;
            
            delay.delayTime.value = 0.1;
            
            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            gain.gain.linearRampToValueAtTime(0.008, now + 2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
            
            // 微妙な周波数変調で「生命」感を演出
            oscillator1.frequency.linearRampToValueAtTime(baseFreq * 1.1, now + 2);
            oscillator2.frequency.linearRampToValueAtTime(baseFreq * 1.5 * 1.1, now + 2);
            
            oscillator1.connect(filter);
            oscillator2.connect(filter);
            filter.connect(delay);
            filter.connect(gain);
            delay.connect(gain);
            gain.connect(this.ambientGain);
            
            oscillator1.start(now);
            oscillator2.start(now);
            oscillator1.stop(now + 4);
            oscillator2.stop(now + 4);
            
            // 次の囁きをスケジュール（15-45秒間隔）
            setTimeout(() => {
                if (this.initialized) createWhisper();
            }, 15000 + Math.random() * 30000);
        };
        
        // 最初の囁きを5秒後に開始
        setTimeout(createWhisper, 5000);
    }

    // 神聖な宇宙のドローン
    private createDivineSpaceDrone(): void {
        if (!this.audioContext || !this.ambientGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter1 = this.audioContext.createBiquadFilter();
        const filter2 = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 30; // 極低音
        
        // 二段階のフィルタリングで暖かみのある音に
        filter1.type = 'lowpass';
        filter1.frequency.value = 120;
        filter1.Q.value = 8;
        
        filter2.type = 'highpass';
        filter2.frequency.value = 25;
        filter2.Q.value = 2;
        
        gain.gain.value = 0.06;
        
        // 非常にゆっくりとした変調で「永遠」感を演出
        const eternityLfo = this.audioContext.createOscillator();
        const eternityLfoGain = this.audioContext.createGain();
        eternityLfo.frequency.value = 0.008; // 125秒周期
        eternityLfoGain.gain.value = 5;
        
        eternityLfo.connect(eternityLfoGain);
        eternityLfoGain.connect(oscillator.frequency);
        
        oscillator.connect(filter1);
        filter1.connect(filter2);
        filter2.connect(gain);
        gain.connect(this.ambientGain);
        
        oscillator.start();
        eternityLfo.start();
        
        this.ambientNodes.set('divine_drone', {
            source: oscillator,
            gainNode: gain
        });
    }

    // 時の流れの音
    private createTemporalEcho(): void {
        if (!this.audioContext || !this.ambientGain) return;
        
        const createEcho = () => {
            if (!this.audioContext || !this.ambientGain) return;
            
            // 時計のような、しかし神秘的な音
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            const delay1 = this.audioContext.createDelay(1.0);
            const delay2 = this.audioContext.createDelay(1.0);
            const feedbackGain = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 800 + Math.random() * 400;
            
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 10;
            
            delay1.delayTime.value = 0.2;
            delay2.delayTime.value = 0.5;
            feedbackGain.gain.value = 0.3;
            
            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0.005, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            
            oscillator.connect(filter);
            filter.connect(delay1);
            delay1.connect(delay2);
            delay2.connect(feedbackGain);
            feedbackGain.connect(delay1); // フィードバック
            filter.connect(gain);
            delay1.connect(gain);
            delay2.connect(gain);
            gain.connect(this.ambientGain);
            
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            
            // 不規則な間隔で時の音を鳴らす（1-10秒）
            setTimeout(() => {
                if (this.initialized) createEcho();
            }, 1000 + Math.random() * 9000);
        };
        
        // 最初のエコーを10秒後に開始
        setTimeout(createEcho, 10000);
    }


    // 天体作成サウンド
    createCelestialBodySound(type: string, position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain || !this.initialized) return;
        
        const now = this.audioContext.currentTime;
        
        switch (type) {
            case 'dust':
                this.playDustCreationSound(position);
                break;
            case 'asteroid':
                this.playAsteroidCreationSound(position);
                break;
            case 'planet':
                this.playPlanetCreationSound(position);
                break;
            case 'star':
                this.playStarCreationSound(position);
                break;
            case 'blackHole':
                this.playBlackHoleSound(position);
                break;
        }
    }

    private playDustCreationSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = 2000;
        
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        filter.Q.value = 5;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        oscillator.frequency.setValueAtTime(2000, now);
        oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        
        this.connectWithSpatialAudio(oscillator, filter, gain, this.effectsGain, position);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }

    private playAsteroidCreationSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // 衝突音のシミュレーション
        const buffer = this.createNoiseBuffer(0.2);
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        source.buffer = buffer;
        
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        filter.Q.value = 1;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        this.connectWithSpatialAudio(source, filter, gain, this.effectsGain, position);
        
        source.start(now);
    }

    private playPlanetCreationSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // 深い共鳴音
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator1.type = 'sine';
        oscillator1.frequency.value = 80;
        
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 120;
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 10;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        
        this.connectWithSpatialAudio(filter, gain, this.effectsGain, position);
        
        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + 2);
        oscillator2.stop(now + 2);
    }

    private playStarCreationSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // インターステラー風の壮大な星の誕生音
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const delay = this.audioContext.createDelay(2.0);
        const feedback = this.audioContext.createGain();
        
        // オーケストラル・ハーモニー (C major chord)
        osc1.type = 'triangle';
        osc1.frequency.value = 130.8; // C3
        osc2.type = 'sine';
        osc2.frequency.value = 164.8; // E3
        osc3.type = 'triangle';
        osc3.frequency.value = 196.0; // G3
        
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        filter.Q.value = 3;
        
        delay.delayTime.value = 0.15;
        feedback.gain.value = 0.5;
        
        const now = this.audioContext.currentTime;
        
        // 神々しい立ち上がり
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
        gain.gain.linearRampToValueAtTime(0.25, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 5);
        
        // 周波数の美しい変化
        osc1.frequency.linearRampToValueAtTime(261.6, now + 1); // C4へ上昇
        osc2.frequency.linearRampToValueAtTime(329.6, now + 1); // E4へ上昇
        osc3.frequency.linearRampToValueAtTime(392.0, now + 1); // G4へ上昇
        
        // フィルターの開放感
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(4000, now + 2);
        filter.frequency.exponentialRampToValueAtTime(1500, now + 5);
        
        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        filter.connect(gain);
        delay.connect(gain);
        
        this.connectWithSpatialAudio(gain, this.effectsGain, position);
        
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 5);
        osc2.stop(now + 5);
        osc3.stop(now + 5);
    }

    private playBlackHoleSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // 時空を引き裂く恐怖と神秘の音
        const lowOsc = this.audioContext.createOscillator();
        const midOsc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter1 = this.audioContext.createBiquadFilter();
        const filter2 = this.audioContext.createBiquadFilter();
        const delay = this.audioContext.createDelay(1.0);
        const feedback = this.audioContext.createGain();
        const distortion = this.audioContext.createWaveShaper();
        
        lowOsc.type = 'sawtooth';
        lowOsc.frequency.value = 15; // 極低音
        midOsc.type = 'triangle';
        midOsc.frequency.value = 45; // 不協和音
        
        // 重力場の歪み
        filter1.type = 'lowpass';
        filter1.frequency.value = 80;
        filter1.Q.value = 15;
        
        filter2.type = 'bandpass';
        filter2.frequency.value = 60;
        filter2.Q.value = 30;
        
        delay.delayTime.value = 0.4;
        feedback.gain.value = 0.6;
        
        // 時空の歪みエフェクト
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
            const x = (i - 128) / 128;
            curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.7);
        }
        distortion.curve = curve;
        
        const now = this.audioContext.currentTime;
        
        // 恐怖の立ち上がり
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 1);
        gain.gain.setValueAtTime(0.3, now + 3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 8);
        
        // 重力による周波数のゆがみ
        lowOsc.frequency.setValueAtTime(15, now);
        lowOsc.frequency.linearRampToValueAtTime(8, now + 4);
        lowOsc.frequency.linearRampToValueAtTime(12, now + 8);
        
        midOsc.frequency.setValueAtTime(45, now);
        midOsc.frequency.linearRampToValueAtTime(30, now + 2);
        midOsc.frequency.linearRampToValueAtTime(50, now + 8);
        
        // フィルターの変調で重力場の変化を表現
        filter1.frequency.setValueAtTime(80, now);
        filter1.frequency.linearRampToValueAtTime(40, now + 4);
        filter1.frequency.linearRampToValueAtTime(70, now + 8);
        
        lowOsc.connect(filter1);
        midOsc.connect(filter2);
        filter1.connect(distortion);
        filter2.connect(distortion);
        distortion.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        distortion.connect(gain);
        delay.connect(gain);
        
        this.connectWithSpatialAudio(gain, this.effectsGain, position);
        
        lowOsc.start(now);
        midOsc.start(now);
        lowOsc.stop(now + 8);
        midOsc.stop(now + 8);
    }

    // 生命進化サウンド
    playEvolutionSound(evolutionType: string, position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain || !this.initialized) return;
        
        switch (evolutionType) {
            case 'microbial':
                this.playMicrobialSound(position);
                break;
            case 'plant':
                this.playPlantSound(position);
                break;
            case 'animal':
                this.playAnimalSound(position);
                break;
            case 'intelligent':
                this.playIntelligentSound(position);
                break;
        }
    }

    private playMicrobialSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // バブル音
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 400;
        
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 10;
        
        const now = this.audioContext.currentTime;
        
        // 複数のバブル
        for (let i = 0; i < 5; i++) {
            const time = now + i * 0.1;
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            oscillator.frequency.setValueAtTime(400 + i * 100, time);
        }
        
        this.connectWithSpatialAudio(oscillator, filter, gain, this.effectsGain, position);
        
        oscillator.start(now);
        oscillator.stop(now + 0.6);
    }

    private playPlantSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // 成長音
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = 600;
        
        filter.type = 'highpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 1.5);
        
        this.connectWithSpatialAudio(oscillator, filter, gain, this.effectsGain, position);
        
        oscillator.start(now);
        oscillator.stop(now + 1.5);
    }

    private playAnimalSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // 生命の鼓動
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator1.type = 'sine';
        oscillator1.frequency.value = 150;
        
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 300;
        
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 5;
        
        const now = this.audioContext.currentTime;
        
        // 心拍のようなリズム
        for (let i = 0; i < 3; i++) {
            const time = now + i * 0.4;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
            gain.gain.setValueAtTime(0, time + 0.16);
            gain.gain.linearRampToValueAtTime(0.1, time + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        }
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        
        this.connectWithSpatialAudio(filter, gain, this.effectsGain, position);
        
        oscillator1.start(now);
        oscillator2.start(now);
        oscillator1.stop(now + 1.5);
        oscillator2.stop(now + 1.5);
    }

    private playIntelligentSound(position?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        // 知的生命体の神聖なる覚醒音
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        const delay1 = this.audioContext.createDelay(0.5);
        const delay2 = this.audioContext.createDelay(0.5);
        const reverb = this.audioContext.createConvolver();
        
        // 神聖なハーモニー（完全4度、完全5度）
        osc1.type = 'sine';
        osc1.frequency.value = 523; // C5
        osc2.type = 'triangle';
        osc2.frequency.value = 698; // F5 (完全4度)
        osc3.type = 'sine';
        osc3.frequency.value = 784; // G5 (完全5度)
        
        filter.type = 'highpass';
        filter.frequency.value = 400;
        filter.Q.value = 3;
        
        delay1.delayTime.value = 0.08;
        delay2.delayTime.value = 0.12;
        
        // 天国的なリバーブ
        const reverbLength = this.audioContext.sampleRate * 2;
        const reverbBuffer = this.audioContext.createBuffer(2, reverbLength, this.audioContext.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const channelData = reverbBuffer.getChannelData(channel);
            for (let i = 0; i < reverbLength; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, 1.5) * 0.3;
            }
        }
        reverb.buffer = reverbBuffer;
        
        const now = this.audioContext.currentTime;
        
        // 荘厳な立ち上がり
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
        gain.gain.linearRampToValueAtTime(0.1, now + 2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
        
        // 覚醒を表現する周波数上昇
        osc1.frequency.linearRampToValueAtTime(1046, now + 1.5); // C6へ
        osc2.frequency.linearRampToValueAtTime(1396, now + 1.5); // F6へ
        osc3.frequency.linearRampToValueAtTime(1568, now + 1.5); // G6へ
        
        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(filter);
        filter.connect(delay1);
        delay1.connect(delay2);
        filter.connect(reverb);
        delay1.connect(reverb);
        delay2.connect(reverb);
        reverb.connect(gain);
        filter.connect(gain);
        
        this.connectWithSpatialAudio(gain, this.effectsGain, position);
        
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 4);
        osc2.stop(now + 4);
        osc3.stop(now + 4);
    }

    // 3D空間でのサウンド再生
    playSound(type: string, position?: THREE.Vector3): void {
        if (!this.audioContext || !this.effectsGain || !this.initialized) return;
        
        switch (type) {
            case 'collision':
                this.playCollisionSound(position);
                break;
            case 'explosion':
                this.playExplosionSound(position);
                break;
            default:
                console.warn(`Unknown sound type: ${type}`);
        }
    }
    
    // UIサウンド
    playUISound(type: string): void {
        if (!this.audioContext || !this.uiGain || !this.initialized) return;
        
        switch (type) {
            case 'click':
                this.playClickSound();
                break;
            case 'tab':
                this.playTabSound();
                break;
            case 'success':
                this.playSuccessSound();
                break;
            case 'error':
                this.playErrorSound();
                break;
        }
    }

    private playClickSound(): void {
        if (!this.audioContext || !this.uiGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        oscillator.connect(gain);
        gain.connect(this.uiGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    private playTabSound(): void {
        if (!this.audioContext || !this.uiGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.value = 600;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        
        oscillator.connect(gain);
        gain.connect(this.uiGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }

    private playSuccessSound(): void {
        if (!this.audioContext || !this.uiGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        
        const now = this.audioContext.currentTime;
        gain.gain.value = 0.1;
        
        // アルペジオ
        oscillator.frequency.setValueAtTime(523, now); // C
        oscillator.frequency.setValueAtTime(659, now + 0.1); // E
        oscillator.frequency.setValueAtTime(784, now + 0.2); // G
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0.1, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        oscillator.connect(gain);
        gain.connect(this.uiGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    private playErrorSound(): void {
        if (!this.audioContext || !this.uiGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 200;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        oscillator.connect(gain);
        gain.connect(this.uiGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
    }
    
    // 衝突音
    private playCollisionSound(position?: THREE.Vector3): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        const oscillator = this.audioContext.createOscillator();
        const noise = this.createWhiteNoise(0.1);
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // 低周波の衝撃音
        oscillator.type = 'sine';
        oscillator.frequency.value = 60;
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        oscillator.connect(filter);
        noise.connect(filter);
        filter.connect(gain);
        
        if (position && this.settings.spatialAudio) {
            this.connectWithSpatialAudio(gain, position, this.effectsGain);
        } else {
            gain.connect(this.effectsGain);
        }
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        noise.start(now);
        noise.stop(now + 0.1);
    }
    
    // 爆発音
    private playExplosionSound(position?: THREE.Vector3): void {
        if (!this.audioContext || !this.effectsGain) return;
        
        const noise = this.createWhiteNoise(0.5);
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        
        // フィルター周波数をスイープ
        filter.frequency.setValueAtTime(3000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        
        noise.connect(filter);
        filter.connect(gain);
        
        if (position && this.settings.spatialAudio) {
            this.connectWithSpatialAudio(gain, position, this.effectsGain);
        } else {
            gain.connect(this.effectsGain);
        }
        
        noise.start(now);
        noise.stop(now + 1.0);
    }
    
    // ホワイトノイズ生成
    private createWhiteNoise(duration: number): AudioBufferSourceNode {
        const bufferSize = this.audioContext!.sampleRate * duration;
        const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext!.createBufferSource();
        noise.buffer = buffer;
        
        return noise;
    }

    // ユーティリティメソッド
    private connectWithSpatialAudio(
        ...nodes: (AudioNode | GainNode | { x: number, y: number, z: number } | undefined)[]
    ): void {
        if (!this.audioContext || !this.settings.spatialAudio) {
            // 空間オーディオ無効時は通常の接続
            const audioNodes = nodes.filter(n => n && 'connect' in n) as AudioNode[];
            for (let i = 0; i < audioNodes.length - 1; i++) {
                audioNodes[i].connect(audioNodes[i + 1]);
            }
            return;
        }
        
        // 空間オーディオ有効時
        const position = nodes.find(n => n && 'x' in n) as { x: number, y: number, z: number } | undefined;
        const audioNodes = nodes.filter(n => n && 'connect' in n) as AudioNode[];
        
        if (position && this.listener) {
            const panner = this.audioContext.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = 10;
            panner.maxDistance = 1000;
            panner.rolloffFactor = 1;
            panner.coneInnerAngle = 360;
            panner.coneOuterAngle = 0;
            panner.coneOuterGain = 0;
            
            panner.setPosition(position.x, position.y, position.z);
            
            // パンナーを挿入
            for (let i = 0; i < audioNodes.length - 1; i++) {
                if (i === audioNodes.length - 2) {
                    audioNodes[i].connect(panner);
                    panner.connect(audioNodes[i + 1]);
                } else {
                    audioNodes[i].connect(audioNodes[i + 1]);
                }
            }
        } else {
            // 位置情報なしの場合は通常接続
            for (let i = 0; i < audioNodes.length - 1; i++) {
                audioNodes[i].connect(audioNodes[i + 1]);
            }
        }
    }

    private createNoiseBuffer(duration: number): AudioBuffer {
        if (!this.audioContext) throw new Error('AudioContext not initialized');
        
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    // 設定管理
    updateSettings(newSettings: Partial<SoundSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.applySettings();
        this.saveSettings();
    }

    private applySettings(): void {
        if (!this.masterGain || !this.ambientGain || !this.effectsGain || !this.uiGain) return;
        
        this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
        this.ambientGain.gain.value = this.settings.ambientVolume;
        this.effectsGain.gain.value = this.settings.effectsVolume;
        this.uiGain.gain.value = this.settings.uiVolume;
    }

    private saveSettings(): void {
        localStorage.setItem('soundSettings', JSON.stringify(this.settings));
    }

    private loadSettings(): void {
        const saved = localStorage.getItem('soundSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {
                console.warn('サウンド設定の読み込みに失敗しました');
            }
        }
    }

    getSettings(): SoundSettings {
        return { ...this.settings };
    }

    // リスナー位置更新（カメラ連動用）
    updateListenerPosition(position: { x: number, y: number, z: number }, orientation?: { x: number, y: number, z: number }): void {
        if (!this.audioContext || !this.listener) return;
        
        this.audioContext.listener.setPosition(position.x, position.y, position.z);
        
        if (orientation) {
            this.audioContext.listener.setOrientation(
                orientation.x, orientation.y, orientation.z,
                0, 1, 0 // up vector
            );
        }
    }

    // クリーンアップ
    dispose(): void {
        this.ambientNodes.forEach(node => {
            if ('stop' in node.source) {
                node.source.stop();
            }
            node.source.disconnect();
            node.gainNode.disconnect();
        });
        
        this.activeEffects.forEach(node => {
            if ('stop' in node.source) {
                node.source.stop();
            }
            node.source.disconnect();
            node.gainNode.disconnect();
        });
        
        this.ambientNodes.clear();
        this.activeEffects.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.initialized = false;
    }

    // テスト音を再生
    playTestTone(): void {
        if (!this.audioContext || !this.masterGain) return;

        const oscillator = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 440; // A4
        
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }
}

export const soundManager = new SoundManager();