export async function onRequestPost(context) {
  const { request, env } = context;
  const { DB, R2, LIGHTNING_KEYS, LIGHTNING_ENDPOINT } = env;

  try {
    const formData = await request.formData();
    const userId = formData.get("user_id") || "user_admin_01";
    const text = formData.get("text");
    const voiceFile = formData.get("voice_file");

    // 1. DATA CHECK: Verify Credits in D1
    const user = await DB.prepare("SELECT credits FROM users WHERE id = ?").bind(userId).first();
    if (!user || user.credits <= 0) return new Response(JSON.stringify({ error: "No Credits" }), { status: 403 });

    // 2. MULTI-API SWITCH: Rotate through your keys
    const keys = LIGHTNING_KEYS.split(',');
    const randomKey = keys[Math.floor(Math.random() * keys.length)];

    // 3. ACTUAL GPU CALL: Sending to Lightning AI
    const gpuPayload = new FormData();
    gpuPayload.append("text", text);
    if (voiceFile) gpuPayload.append("file", voiceFile);

    const gpuRes = await fetch(LIGHTNING_ENDPOINT, {
      method: "POST",
      headers: { "Authorization": `Bearer ${randomKey}` },
      body: gpuPayload
    });

    if (!gpuRes.ok) throw new Error("Lightning AI Server Error");

    const audioBlob = await gpuRes.blob();
    const audioName = `${userId}/${Date.now()}.mp3`;

    // 4. STORAGE: Save actual audio file to Cloudflare R2
    await R2.put(audioName, audioBlob);
    const publicUrl = `https://your-r2-public-domain.com/${audioName}`;

    // 5. UPDATE D1: Deduct credit & Log project
    await DB.prepare("UPDATE users SET credits = credits - 1 WHERE id = ?").bind(userId).run();
    await DB.prepare("INSERT INTO voices (id, user_id, name, text_content, audio_url) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), userId, "Project_" + Date.now(), text, publicUrl).run();

    return new Response(audioBlob, { headers: { "Content-Type": "audio/mpeg" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
