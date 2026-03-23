export async function onRequestPost(context) {
  const { request, env } = context;
  const { DB, LIGHTNING_KEYS, LIGHTNING_ENDPOINT } = env;

  try {
    const formData = await request.formData();
    const userId = formData.get("user_id") || "user_123";
    const text = formData.get("text");
    const voiceFile = formData.get("voice_file");

    // 1. Check D1 for Credits
    const user = await DB.prepare("SELECT credits FROM users WHERE id = ?").bind(userId).first();
    if (!user || user.credits <= 0) {
      return new Response(JSON.stringify({ error: "Out of credits" }), { status: 403 });
    }

    // 2. Rotate Lightning AI Keys
    const keys = LIGHTNING_KEYS.split(',');
    const activeKey = keys[Math.floor(Math.random() * keys.length)];

    // 3. Forward to Lightning AI
    // Note: Adjust the JSON body based on your specific Lightning AI Studio setup
    const gpuRes = await fetch(LIGHTNING_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${activeKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text,
        model: "qwen3-tts-1.7b",
        voice_id: voiceFile ? "cloned" : "preset_1"
      })
    });

    if (!gpuRes.ok) throw new Error("GPU Server Error");

    // 4. Deduct Credit
    await DB.prepare("UPDATE users SET credits = credits - 1 WHERE id = ?").bind(userId).run();

    return new Response(gpuRes.body, { headers: { "Content-Type": "audio/mpeg" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
