API層の型安全化 

\*\*対象ファイル\*\*: `src/handlers/`, `src/routes/`

```rust

// 型安全なAPIハンドラー

\#\[utoipa::path(

&nbsp;   post,

&nbsp;   path = "/api/celestial-bodies",

&nbsp;   request\_body = CreateCelestialBodyRequest,

&nbsp;   responses(

&nbsp;       (status = 201, description = "Created", body = CelestialBody),

&nbsp;       (status = 400, description = "Bad Request", body = ErrorResponse)

&nbsp;   )

)]

pub async fn create\_celestial\_body(

&nbsp;   req: web::Json<CreateCelestialBodyRequest>,

) -> Result<HttpResponse> {

&nbsp;   // 型安全な実装

}

```



\*\*作業内容:\*\*

\- \[ ] リクエスト/レスポンス型の厳密化

\- \[ ] バリデーションロジックの統一

\- \[ ] OpenAPI仕様の完全対応



作業時間より質重視で

