export async function onRequestPost(context) {
  const { request, env } = context;
  
  // These bindings MUST be set in your Pages Dashboard Settings
  const { DB, LIGHTNING_KEYS, LIGHTNING_ENDPOINT } = env;

  try {
    const formData = await request.formData();
    const userId = formData.get("user_id") || "user_admin_01";
    const text = formData.get("text");
    const voiceFile = formData.get("voice_file"); // .pth or .wav

    // 1. D1 DATA CHECK: Verify user and credits
    const user = await DB.prepare("SELECT credits FROM users WHERE id = ?")
      .bind(userId).first();

    if (!user) return new Response(JSON.stringify({ error: "User not found in D1" }), { status: 404 });
    if (user.credits <= 0) return new Response(JSON.stringify({ error: "Insufficient Credits" }), { status: 403 });

    // 2. MULTI-API ROTATION: Split the comma-separated keys from Environment Variables
    const keyPool = LIGHTNING_KEYS.split(',');
    const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

    // 3. ACTUAL CONNECTION: Forwarding to Lightning AI
    const gpuPayload = new FormData();
    gpuPayload.append("text", text);
    if (voiceFile) gpuPayload.append("file", voiceFile);

    const gpuRes = await fetch(LIGHTNING_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${selectedKey}` },
      body: gpuPayload
    });

    if (!gpuRes.ok) throw new Error("Lightning AI Studio failed to respond");

    const audioBlob = await gpuRes.blob();

    // 4. TRANSACTION: Deduct 1 credit from D1
    await DB.prepare("UPDATE users SET credits = credits - 1 WHERE id = ?")
      .bind(userId).run();

    // Return real audio to the frontend
    return new Response(audioBlob, {
      headers: { 
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
