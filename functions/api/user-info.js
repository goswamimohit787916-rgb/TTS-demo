export async function onRequestGet(context) {
  const { request, env } = context;
  const { DB } = env;

  // Get the ID from the URL: /api/user-info?id=user_admin_01
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('id');

  if (!userId) return new Response("Missing ID", { status: 400 });

  try {
    // ACTUAL DATA QUERY
    const user = await DB.prepare("SELECT email, credits, plan FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

