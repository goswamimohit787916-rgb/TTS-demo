export async function onRequestPost(context) {

  const body = await context.request.json();

  // 🔴 PUT YOUR GRADIO LINK HERE
  const GRADIO = "https://xxxxx.gradio.live/run/predict";

  const res = await fetch(GRADIO, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      data: [body.text, "", 0.7, 0.9, 1.1]
    })
  });

  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}
