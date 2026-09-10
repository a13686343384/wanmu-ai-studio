const base = "http://localhost:3000";
async function main() {
  const res = await fetch(`${base}/api/auth/csrf`);
  const { csrfToken } = await res.json();
  const cookies = res.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const r2 = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
    body: new URLSearchParams({ csrfToken, email: "demo@wanmusheng.com", password: "demo1234", json: "true" }),
  });
  const C = r2.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  const H = { "Content-Type": "application/json", Cookie: C };
  const list = (await (await fetch(`${base}/api/scripts`, { headers: { Cookie: C } })).json()).data;
  const sid = list[0].id;
  const d = (await (await fetch(`${base}/api/scripts/${sid}`, { headers: { Cookie: C } })).json()).data;
  const [a, b] = d.characters;
  console.log("characters:", d.characters.map(c => c.name).join(", "));

  // 1. lock a, then bulk generate should skip (or 400 when all locked)
  await fetch(`${base}/api/scripts/${sid}/assets/${a.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ locked: true }) });
  const g1 = await fetch(`${base}/api/scripts/${sid}/assets/generate`, { method: "POST", headers: H, body: JSON.stringify({ kind: "character", model: "all-in-one", resolution: "1K" }) });
  console.log("bulk with 1 locked:", g1.status, (await g1.text()).slice(0, 120));

  // 2. merge a into b
  const m = await fetch(`${base}/api/scripts/${sid}/assets/merge`, { method: "POST", headers: H, body: JSON.stringify({ sourceId: a.id, targetId: b.id }) });
  console.log("merge:", m.status, (await m.text()).slice(0, 160));
  const d2 = (await (await fetch(`${base}/api/scripts/${sid}`, { headers: { Cookie: C } })).json()).data;
  const tb = d2.characters.find(c => c.id === b.id);
  console.log("after merge, characters:", d2.characters.map(c => c.name).join(", "), "| target aliases:", tb?.aliases);

  // 3. self-merge guard
  const m2 = await fetch(`${base}/api/scripts/${sid}/assets/merge`, { method: "POST", headers: H, body: JSON.stringify({ sourceId: b.id, targetId: b.id }) });
  console.log("self merge:", m2.status);

  // 4. reset semantics
  await fetch(`${base}/api/scripts/${sid}/assets/${b.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ reset: true }) });
  const d3 = (await (await fetch(`${base}/api/scripts/${sid}`, { headers: { Cookie: C } })).json()).data;
  const tb3 = d3.characters.find(c => c.id === b.id);
  console.log("after reset: status:", tb3.status, "refImages:", JSON.stringify(tb3.refImages), "imageUrl kept:", Boolean(tb3.imageUrl));
}
main().catch(e => { console.error(e); process.exit(1); });
