use reqwest::Client;
use tokio;

#[tokio::test]
async fn health_endpoint_returns_ok_and_db_status() {
    // Assumes the server is running on localhost:3000
    let client = Client::new();
    let resp = client
        .get("http://localhost:3000/health")
        .send()
        .await
        .expect("Failed to send request");

    assert!(
        resp.status().is_success(),
        "Health endpoint did not return 200 OK"
    );

    let json: serde_json::Value = resp.json().await.expect("Failed to parse JSON response");

    assert_eq!(json["api_status"], "ok", "API status should be 'ok'");
    assert!(
        json["database"] == "ok" || json["database"] == "error",
        "Database status should be 'ok' or 'error'"
    );
}
