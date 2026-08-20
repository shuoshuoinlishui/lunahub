const B = 'http://localhost:3000';
const J = (r) => r.json();
async function req(method, path, body, token) {
  const opt = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opt.headers.Authorization = 'Bearer ' + token;
  if (body) opt.body = JSON.stringify(body);
  const r = await fetch(B + path, opt);
  let data = null; try { data = await r.json(); } catch (e) {}
  return { status: r.status, data };
}
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  -> ' + JSON.stringify(extra) : '')); }
}

(async () => {
  console.log('1) 匿名读取论坛');
  let r = await req('GET', '/api/forum');
  check('200', r.status === 200, r.status);
  check('含 5 个话题', r.data.topics.length === 5, r.data.topics.length);
  check('不含 hidden 话题', r.data.topics.every(t => !t.hidden));
  check('含公告', r.data.announcements.length >= 1);
  check('含分类', r.data.categories.length >= 5);

  console.log('2) 注册新用户 tester1');
  r = await req('POST', '/api/register', { user: 'tester1', pass: 'secret1' });
  check('201', r.status === 201, r.status);
  check('返回 token', !!r.data.token);
  const t1 = r.data.token;
  check('role=user', r.data.role === 'user');

  console.log('3) 注册重名应 409');
  r = await req('POST', '/api/register', { user: 'tester1', pass: 'secret1' });
  check('409', r.status === 409, r.status);

  console.log('4) 弱密码应 400');
  r = await req('POST', '/api/register', { user: 'weak', pass: '123' });
  check('400', r.status === 400, r.status);

  console.log('5) 登录管理员 admin/admin123');
  r = await req('POST', '/api/login', { user: 'admin', pass: 'admin123' });
  check('200', r.status === 200, r.status);
  check('role=admin', r.data.role === 'admin');
  const adm = r.data.token;

  console.log('6) 普通用户发话题（需 token）');
  r = await req('POST', '/api/topics', { title: '测试话题A', category: '一般讨论', body: '正文内容', }, t1);
  check('201', r.status === 201, r.status);
  const tid = r.data.topic.id;
  check('作者=tester1', r.data.topic.author === 'tester1');

  console.log('7) 匿名发话题应 401');
  r = await req('POST', '/api/topics', { title: 'x', category: '一般讨论' });
  check('401', r.status === 401, r.status);

  console.log('8) 嵌套回复：先顶层，再嵌套');
  r = await req('POST', '/api/topics/' + tid + '/replies', { body: '顶层回复' }, t1);
  check('201', r.status === 201, r.status);
  const topRid = r.data.reply.id;
  r = await req('POST', '/api/topics/' + tid + '/replies', { body: '嵌套回复', parentId: topRid }, t1);
  check('201', r.status === 201, r.status);
  const nestedRid = r.data.reply.id;

  console.log('9) 读取话题详情，确认嵌套结构');
  r = await req('GET', '/api/topics/' + tid, null, t1);
  check('200', r.status === 200, r.status);
  const topic = r.data.topic;
  check('顶层1条', topic.replies.length === 1);
  check('嵌套1条', topic.replies[0].children.length === 1);
  check('嵌套作者正确', topic.replies[0].children[0].author === 'tester1');

  console.log('10) 话题点赞（toggle）');
  r = await req('POST', '/api/topics/' + tid + '/like', {}, t1);
  check('liked=true', r.data.liked === true, r.data);
  r = await req('POST', '/api/topics/' + tid + '/like', {}, t1);
  check('liked=false(取消)', r.data.liked === false, r.data);

  console.log('11) 回复点赞');
  r = await req('POST', '/api/replies/' + topRid + '/like', {}, t1);
  check('liked=true', r.data.liked === true, r.data);

  console.log('12) 管理员：置顶话题');
  r = await req('POST', '/api/admin/topics/' + tid + '/pin', { pinned: true }, adm);
  check('200 pinned', r.status === 200 && r.data.pinned === true, r.data);
  console.log('13) 管理员：隐藏话题');
  r = await req('POST', '/api/admin/topics/' + tid + '/hide', { hidden: true }, adm);
  check('200 hidden', r.status === 200 && r.data.hidden === true, r.data);
  console.log('14) 隐藏后匿名不可见');
  r = await req('GET', '/api/forum');
  check('列表不含隐藏话题', !r.data.topics.some(t => t.id === tid), r.data.topics.map(t=>t.id));
  console.log('15) 隐藏后管理员可见');
  r = await req('GET', '/api/forum', null, adm);
  check('管理员可见隐藏', r.data.topics.some(t => t.id === tid && t.hidden), '');

  console.log('16) 管理员：发布公告');
  r = await req('POST', '/api/announcements', { title: '系统维护通知', body: '今晚维护' }, adm);
  check('201', r.status === 201, r.status);

  console.log('17) 管理员：用户列表');
  r = await req('GET', '/api/admin/users', null, adm);
  check('200', r.status === 200, r.status);
  check('含 tester1', r.data.users.some(u => u.user === 'tester1'));

  console.log('18) 管理员：改 tester1 为 admin');
  r = await req('POST', '/api/admin/users/tester1/role', { role: 'admin' }, adm);
  check('200', r.status === 200 && r.data.role === 'admin', r.data);

  console.log('19) 普通用户调管理接口应 403');
  r = await req('GET', '/api/admin/users', null, t1);
  check('403', r.status === 403, r.status);

  console.log('20) 错误 token 应 401');
  r = await req('GET', '/api/me', null, 'garbage.token');
  check('401', r.status === 401, r.status);

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('测试异常', e); process.exit(2); });
