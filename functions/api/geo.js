export async function onRequestGet({ request }) {
  const cf = request && request.cf ? request.cf : {};
  const country = cf && cf.country ? cf.country : "OTHER";
  let lang = "en";
  if (country === "JP") lang = "ja";
  else if (country === "CN") lang = "zh";
  return new Response(JSON.stringify({ country, lang }), {
    headers: { "content-type": "application/json" }
  });
}
