// node laotoule/games/marbles.selftest.js
var fs = require('fs');
var path = require('path');
var physics = require('./marbles.physics.js');
var report = physics.selfTest();
var html = fs.readFileSync(path.join(__dirname, 'marbles.html'), 'utf8');
var sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
function fail(msg){ report.ok = false; report.errors.push(msg); }
if (html.indexOf('marbles.physics.js') < 0) fail('页面没有引用物理脚本');
if (html.indexOf('把彩色弹珠撞进洞里') < 0) fail('页面没有写出目标');
if (html.indexOf('id="restart"') < 0) fail('页面没有重新开始按钮');
if (html.indexOf('touch-action:none') < 0 && html.indexOf('touch-action: none') < 0) fail('球桌没有单独禁止滑动');
if (/https?:\/\//.test(html)) fail('页面引用了外网地址');
if (html.indexOf('cdn') >= 0) fail('页面像是在用外部 CDN');
if (sw.indexOf('laotoule-v2.20') < 0) fail('离线缓存还不是 2.20');
if (sw.indexOf('games/marbles.html') < 0 || sw.indexOf('games/marbles.physics.js') < 0) fail('离线缓存没有加入弹珠');
if (!report.ok) {
  console.error(report.errors.join('\n'));
  process.exit(1);
}
console.log('marbles selftest ok checks=' + report.checks);
