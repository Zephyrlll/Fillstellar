# **Cosmic Gardener: 技術スタック概要 (AI向け)**

## **1\. プロジェクト概要**

* **プロジェクト名:** Cosmic Gardener  
* **カテゴリ:** リアルタイム・マルチプレイヤーWebゲーム  
* **アーキテクチャ思想:** パフォーマンスと安全性を最優先するRust製のコア・エンジンを、データ分析と運営の柔軟性を重視するPython製のエコシステムがサポートするハイブリッド構成。

## **2\. コア・バックエンド (Rust Engine)**

このセクションは、サービスの心臓部であり、リアルタイム性と堅牢性を担当します。

* **テクノロジー名:** **Rust**  
  * **カテゴリ:** プログラミング言語  
  * **主要な役割:** バックエンドアプリケーション全体の開発言語。  
  * **キーワード:** performance, memory-safety, concurrency, security, systems-programming  
* **テクノロジー名:** **Actix Web**  
  * **カテゴリ:** Webフレームワーク  
  * **主要な役割:** HTTPリクエストの受付、APIエンドポイントの提供、およびWebサーバーとしての基本的な機能を提供。  
  * **キーワード:** web-framework, high-performance, http-server, routing, middleware  
* **テクノロジー名:** **actix-ws**  
  * **カテゴリ:** WebSocketライブラリ  
  * **主要な役割:** プレイヤー（クライアント）とサーバー間のリアルタイム双方向通信を確立・管理。  
  * **キーワード:** websocket, real-time, full-duplex, session-management  
* **テクノロジー名:** **SQLx**  
  * **カテゴリ:** データベース・ライブラリ (非同期)  
  * **主要な役割:** コンパイル時に型チェックを行う安全なSQLクエリを実行し、PostgreSQLデータベースと連携。  
  * **キーワード:** database-connector, async, type-safe, sql, orm-like  
* **テクノロジー名:** **Tokio**  
  * **カテゴリ:** 非同期ランタイム  
  * **主要な役割:** Rustの非同期処理（async/await）を実行するための基盤。  
  * **キーワード:** async-runtime, non-blocking-io, concurrency, scheduler

## **3\. フロントエンド (Client)**

このセクションは、ユーザーのブラウザ上で実行され、ビジュアルとインタラクションを担当します。

* **テクノロジー名:** **HTML/CSS/JavaScript**  
  * **カテゴリ:** Web標準技術  
  * **主要な役割:** ゲームのUI構造、スタイリング、およびクライアントサイドの基本的なロジックを実装。  
  * **キーワード:** frontend, ui, dom, styling, client-side-scripting  
* **テクノロジー名:** **Three.js**  
  * **カテゴリ:** 3Dグラフィックス・ライブラリ  
  * **主要な役割:** WebGLを利用して、宇宙空間、惑星、恒星などの3Dオブジェクトを描画。  
  * **キーワード:** 3d-graphics, webgl, rendering, scene-graph, animation

## **4\. データベース**

このセクションは、全ての永続データを格納するデータストアを担当します。

* **テクノロジー名:** **PostgreSQL**  
  * **カテゴリ:** リレーショナルデータベース管理システム (RDBMS)  
  * **主要な役割:** プレイヤー情報、天体の状態、研究の進捗など、ゲームに関する全てのデータを永続的に保存。  
  * **キーワード:** database, rdbms, sql, data-persistence, acid-compliance

## **5\. インフラストラクチャ & デプロイメント**

このセクションは、アプリケーションが稼働する環境と、その配置プロセスを担当します。

* **テクノロジー名:** **Amazon Lightsail**  
  * **カテゴリ:** クラウドコンピューティング (VPS)  
  * **主要な役割:** アプリケーションをホストする本番サーバー環境。  
  * **キーワード:** cloud-hosting, vps, server, infrastructure-as-a-service  
* **テクノロジー名:** **Ubuntu 22.04 LTS**  
  * **カテゴリ:** オペレーティングシステム  
  * **主要な役割:** Lightsailインスタンス上で稼働するサーバーOS。  
  * **キーワード:** os, linux, server-os, long-term-support  
* **テクノロジー名:** **Nginx**  
  * **カテゴリ:** Webサーバー / リバースプロキシ  
  * **主要な役割:** 静的ファイルの配信と、外部からのリクエストを内部のRustアプリケーションに転送。  
  * **キーワード:** reverse-proxy, web-server, load-balancing, ssl-termination  
* **テクノロジー名:** **systemd**  
  * **カテゴリ:** initシステム  
  * **主要な役割:** コンパイル済みのRustアプリケーションを、サーバー上で永続的に稼働するサービスとして管理。  
  * **キーワード:** service-manager, daemon, process-supervision  
* **テクノロジー名:** **Let's Encrypt**  
  * **カテゴリ:** 証明書認証局 (CA)  
  * **主要な役割:** 無料のSSL/TLS証明書を発行し、クライアントとサーバー間の通信を暗号化 (HTTPS)。  
  * **キーワード:** ssl, tls, https, encryption, security

## **6\. 支援 & 運用エコシステム (Python)**

このセクションは、コアゲームの開発・運営をサポートする周辺ツール群を担当します。

* **テクノロジー名:** **Python**  
  * **カテゴリ:** プログラミング言語  
  * **主要な役割:** 運営ツール、データ分析、デプロイスクリプトなど、迅速な開発が求められる支援システムを構築。  
  * **キーワード:** scripting, data-analysis, automation, web-development  
* **テクノロジー名:** **Flask / Django**  
  * **カテゴリ:** Webフレームワーク  
  * **主要な役割:** 運営者向けの管理用Webダッシュボードを構築。  
  * **キーワード:** admin-dashboard, web-framework, backend-for-frontend  
* **テクノロジー名:** **Jupyter Notebook**  
  * **カテゴリ:** 対話型コンピューティング環境  
  * **主要な役割:** プレイヤーの行動ログなどのデータを対話形式で分析し、可視化。  
  * **キーワード:** data-science, notebook, interactive-computing, visualization  
* **テクノロジー名:** **Pandas**  
  * **カテゴリ:** データ操作ライブラリ  
  * **主要な役割:** データベースから取得した大量のデータを効率的に整形、集計、分析。  
  * **キーワード:** data-manipulation, dataframe, data-analysis, etl