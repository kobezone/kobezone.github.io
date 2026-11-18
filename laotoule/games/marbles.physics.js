// 弹珠弹弹乐 — 纯物理与关卡。浏览器挂到 MarblePhysics，Node 可 require。
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarblePhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SLEEP = 16;
  var MAX_SPEED = 1900;
  var MIN_DRAG = 46;
  var MAX_DRAG = 340;
  var MIN_SHOT = 640;
  var MAX_SHOT = 1580;
  var HIT_SOUND = 42;

  var TABLE = {
    w: 1000,
    h: 1500,
    L: 96,
    T: 124,
    R: 904,
    B: 1376,
    ballR: 86,
    cue: { x: 500, y: 1128 }
  };

  var POCKETS = [
    { id: 'tl', x: 96, y: 124, r: 108, capture: 118, mouth: 136, sides: ['L', 'T'], bonus: false },
    { id: 'tc', x: 500, y: 108, r: 118, capture: 108, mouth: 148, sides: ['T'], bonus: true },
    { id: 'tr', x: 904, y: 124, r: 108, capture: 118, mouth: 136, sides: ['R', 'T'], bonus: false },
    { id: 'bl', x: 96, y: 1376, r: 108, capture: 118, mouth: 136, sides: ['L', 'B'], bonus: false },
    { id: 'br', x: 904, y: 1376, r: 108, capture: 118, mouth: 136, sides: ['R', 'B'], bonus: false }
  ];

  var LEVELS = [
    {
      name: '三颗弹珠',
      shots: 6,
      bumpers: [{ x: 236, y: 980, r: 58 }, { x: 764, y: 980, r: 58 }],
      targets: [
        { x: 500, y: 640, color: 'cobalt' },
        { x: 330, y: 400, color: 'ruby' },
        { x: 670, y: 400, color: 'amber' }
      ]
    },
    {
      name: '四颗弹珠',
      shots: 6,
      bumpers: [{ x: 236, y: 980, r: 58 }, { x: 764, y: 980, r: 58 }],
      targets: [
        { x: 500, y: 700, color: 'emerald' },
        { x: 350, y: 480, color: 'amethyst' },
        { x: 650, y: 480, color: 'aqua' },
        { x: 500, y: 300, color: 'rose' }
      ]
    },
    {
      name: '左右开弓',
      shots: 6,
      bumpers: [{ x: 220, y: 960, r: 56 }, { x: 780, y: 960, r: 56 }],
      targets: [
        { x: 500, y: 620, color: 'cobalt' },
        { x: 280, y: 430, color: 'ruby' },
        { x: 720, y: 430, color: 'amber' },
        { x: 500, y: 300, color: 'emerald' }
      ]
    },
    {
      name: '五颗弹珠',
      shots: 6,
      bumpers: [{ x: 228, y: 990, r: 54 }, { x: 772, y: 990, r: 54 }],
      targets: [
        { x: 500, y: 720, color: 'aqua' },
        { x: 340, y: 540, color: 'rose' },
        { x: 660, y: 540, color: 'amethyst' },
        { x: 390, y: 340, color: 'amber' },
        { x: 610, y: 340, color: 'cobalt' }
      ]
    },
    {
      name: '再来五颗',
      shots: 6,
      bumpers: [{ x: 250, y: 1000, r: 52 }, { x: 750, y: 1000, r: 52 }],
      targets: [
        { x: 500, y: 780, color: 'ruby' },
        { x: 360, y: 540, color: 'amber' },
        { x: 640, y: 540, color: 'emerald' },
        { x: 500, y: 320, color: 'cobalt' },
        { x: 210, y: 700, color: 'rose' }
      ]
    }
  ];

  function hypot(x, y) { return Math.sqrt(x * x + y * y); }

  function createBall(spec) {
    var b = {
      id: spec.id,
      role: spec.role || 'target',
      x: spec.x,
      y: spec.y,
      r: spec.r,
      vx: spec.vx || 0,
      vy: spec.vy || 0,
      alive: spec.alive !== false,
      asleep: spec.asleep !== false,
      pocketed: !!spec.pocketed,
      pocketId: spec.pocketId || null,
      roll: spec.roll || 0,
      heading: spec.heading || 0,
      mass: spec.mass > 0 ? spec.mass : spec.r * spec.r,
      color: spec.color || null,
      restitution: spec.restitution
    };
    return b;
  }

  function createWorld(spec) {
    return {
      L: spec.L,
      T: spec.T,
      R: spec.R,
      B: spec.B,
      balls: (spec.balls || []).map(createBall),
      bumpers: spec.bumpers || [],
      pockets: spec.pockets || [],
      restitutionBall: spec.restitutionBall != null ? spec.restitutionBall : 0.84,
      restitutionWall: spec.restitutionWall != null ? spec.restitutionWall : 0.72,
      restitutionBumper: spec.restitutionBumper != null ? spec.restitutionBumper : 0.92,
      friction: spec.friction != null ? spec.friction : 150,
      viscous: spec.viscous != null ? spec.viscous : 0.36,
      events: [],
      time: 0
    };
  }

  function tableWorld(level, extras) {
    var lv = LEVELS[level];
    var balls = [{
      id: 'cue',
      role: 'cue',
      x: TABLE.cue.x,
      y: TABLE.cue.y,
      r: TABLE.ballR,
      color: 'cue'
    }];
    for (var i = 0; i < lv.targets.length; i++) {
      var t = lv.targets[i];
      balls.push({
        id: 't' + i,
        role: 'target',
        x: t.x,
        y: t.y,
        r: TABLE.ballR,
        color: t.color
      });
    }
    var spec = {
      L: TABLE.L,
      T: TABLE.T,
      R: TABLE.R,
      B: TABLE.B,
      pockets: POCKETS,
      bumpers: lv.bumpers,
      balls: balls
    };
    if (extras) {
      for (var k in extras) spec[k] = extras[k];
    }
    return createWorld(spec);
  }

  function speedOf(b) { return hypot(b.vx, b.vy); }

  function aliveBalls(world) {
    var out = [];
    for (var i = 0; i < world.balls.length; i++) {
      if (world.balls[i].alive) out.push(world.balls[i]);
    }
    return out;
  }

  function canShoot(world) {
    for (var i = 0; i < world.balls.length; i++) {
      var b = world.balls[i];
      if (b.alive && speedOf(b) > SLEEP) return false;
    }
    return true;
  }

  function findBall(world, id) {
    for (var i = 0; i < world.balls.length; i++) {
      if (world.balls[i].id === id) return world.balls[i];
    }
    return null;
  }

  function clampSpeed(b) {
    var sp = speedOf(b);
    if (sp > MAX_SPEED) {
      var k = MAX_SPEED / sp;
      b.vx *= k;
      b.vy *= k;
    }
  }

  function pushEvent(world, ev) {
    world.events.push(ev);
  }

  function pocketReach(pocket, radius) {
    return pocket.capture + radius * 0.5;
  }

  function capture(world, ball, pocket) {
    if (!ball.alive || ball.pocketed) return;
    ball.alive = false;
    ball.pocketed = true;
    ball.vx = 0;
    ball.vy = 0;
    ball.asleep = true;
    ball.pocketId = pocket.id;
    pushEvent(world, {
      type: 'pocket',
      id: ball.id,
      role: ball.role,
      pocket: pocket.id,
      bonus: !!pocket.bonus,
      x: pocket.x,
      y: pocket.y
    });
  }

  function noteHit(world, impact, x, y, kind) {
    if (impact < HIT_SOUND) return;
    pushEvent(world, { type: 'hit', speed: impact, x: x, y: y, kind: kind });
  }

  function applyFriction(world, b, dt) {
    var sp = speedOf(b);
    if (sp <= SLEEP) {
      b.vx = 0;
      b.vy = 0;
      b.asleep = true;
      return;
    }
    b.asleep = false;
    b.heading = Math.atan2(b.vy, b.vx);
    b.roll += sp * dt / b.r;
    var drop = world.friction * dt;
    var nsp = sp - drop;
    if (nsp < 0) nsp = 0;
    var visc = Math.exp(-world.viscous * dt);
    var k = sp > 0 ? (nsp / sp) * visc : 0;
    b.vx *= k;
    b.vy *= k;
    if (speedOf(b) <= SLEEP) {
      b.vx = 0;
      b.vy = 0;
      b.asleep = true;
    }
  }

  function separatePair(a, b) {
    if (!a.alive || !b.alive) return 0;
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var dist = hypot(dx, dy);
    var min = a.r + b.r;
    if (dist >= min) return 0;
    var nx, ny;
    if (dist < 1e-6) {
      nx = 1;
      ny = 0;
      dist = 1e-6;
    } else {
      nx = dx / dist;
      ny = dy / dist;
    }
    var overlap = min - dist;
    var invA = 1 / a.mass;
    var invB = 1 / b.mass;
    var inv = invA + invB;
    var corr = overlap;
    a.x -= nx * corr * (invA / inv);
    a.y -= ny * corr * (invA / inv);
    b.x += nx * corr * (invB / inv);
    b.y += ny * corr * (invB / inv);
    return overlap;
  }

  function resolveBallBall(world, a, b) {
    if (!a.alive || !b.alive) return;
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var dist = hypot(dx, dy);
    var min = a.r + b.r;
    if (dist >= min) return;
    var nx, ny;
    if (dist < 1e-6) {
      nx = 1;
      ny = 0;
      dist = 1e-6;
    } else {
      nx = dx / dist;
      ny = dy / dist;
    }
    var overlap = min - dist;
    var slop = 0.75;
    var percent = 0.85;
    if (overlap > slop) {
      var invA = 1 / a.mass;
      var invB = 1 / b.mass;
      var inv = invA + invB;
      var corr = (overlap - slop) * percent;
      a.x -= nx * corr * (invA / inv);
      a.y -= ny * corr * (invA / inv);
      b.x += nx * corr * (invB / inv);
      b.y += ny * corr * (invB / inv);
    }
    var rvx = b.vx - a.vx;
    var rvy = b.vy - a.vy;
    var velN = rvx * nx + rvy * ny;
    if (velN >= -8) {
      if (velN < 0) {
        var share = velN / 2;
        a.vx += share * nx;
        a.vy += share * ny;
        b.vx -= share * nx;
        b.vy -= share * ny;
      }
      return;
    }
    var eA = a.restitution != null ? a.restitution : world.restitutionBall;
    var eB = b.restitution != null ? b.restitution : world.restitutionBall;
    var e = eA < eB ? eA : eB;
    var invA2 = 1 / a.mass;
    var invB2 = 1 / b.mass;
    var invSum = invA2 + invB2;
    var j = -(1 + e) * velN / invSum;
    a.vx -= j * invA2 * nx;
    a.vy -= j * invA2 * ny;
    b.vx += j * invB2 * nx;
    b.vy += j * invB2 * ny;
    var tx = -ny;
    var ty = nx;
    var velT = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
    var mu = 0.06;
    var jt = -velT / invSum;
    var maxF = j * mu;
    if (jt > maxF) jt = maxF;
    if (jt < -maxF) jt = -maxF;
    a.vx -= jt * invA2 * tx;
    a.vy -= jt * invA2 * ty;
    b.vx += jt * invB2 * tx;
    b.vy += jt * invB2 * ty;
    clampSpeed(a);
    clampSpeed(b);
    a.asleep = false;
    b.asleep = false;
    noteHit(world, -velN, (a.x + b.x) / 2, (a.y + b.y) / 2, 'ball');
  }

  function resolveBumper(world, ball, c) {
    if (!ball.alive) return;
    var dx = ball.x - c.x;
    var dy = ball.y - c.y;
    var dist = hypot(dx, dy);
    var min = ball.r + c.r;
    if (dist >= min) return;
    var nx, ny;
    if (dist < 1e-6) {
      nx = 0;
      ny = -1;
      dist = 1e-6;
    } else {
      nx = dx / dist;
      ny = dy / dist;
    }
    var overlap = min - dist;
    ball.x += nx * (overlap + 0.4);
    ball.y += ny * (overlap + 0.4);
    var velN = ball.vx * nx + ball.vy * ny;
    if (velN < 0) {
      var e = world.restitutionBumper;
      ball.vx -= (1 + e) * velN * nx;
      ball.vy -= (1 + e) * velN * ny;
      clampSpeed(ball);
      ball.asleep = false;
      noteHit(world, -velN, ball.x - nx * ball.r, ball.y - ny * ball.r, 'bumper');
    }
  }

  function gapPocket(world, side, ball) {
    for (var i = 0; i < world.pockets.length; i++) {
      var p = world.pockets[i];
      var has = false;
      for (var s = 0; s < p.sides.length; s++) if (p.sides[s] === side) has = true;
      if (!has) continue;
      var along, into;
      if (side === 'T' || side === 'B') {
        along = Math.abs(ball.x - p.x);
        into = side === 'T' ? (ball.y - world.T) : (world.B - ball.y);
      } else {
        along = Math.abs(ball.y - p.y);
        into = side === 'L' ? (ball.x - world.L) : (world.R - ball.x);
      }
      if (along < p.mouth && into < p.mouth) return p;
    }
    return null;
  }

  function resolveWalls(world, ball) {
    if (!ball.alive) return;
    var r = ball.r;
    var e = world.restitutionWall;
    var L = world.L, T = world.T, R = world.R, B = world.B;

    if (ball.x < L + r && !gapPocket(world, 'L', ball)) {
      ball.x = L + r;
      if (ball.vx < 0) {
        var impact = -ball.vx;
        ball.vx = -ball.vx * e;
        if (Math.abs(ball.vx) < 10) ball.vx = 0;
        if (world.friction > 0) ball.vy *= 0.94;
        noteHit(world, impact, L, ball.y, 'wall');
      }
    }
    if (ball.x > R - r && !gapPocket(world, 'R', ball)) {
      ball.x = R - r;
      if (ball.vx > 0) {
        var impactR = ball.vx;
        ball.vx = -ball.vx * e;
        if (Math.abs(ball.vx) < 10) ball.vx = 0;
        if (world.friction > 0) ball.vy *= 0.94;
        noteHit(world, impactR, R, ball.y, 'wall');
      }
    }
    if (ball.y < T + r && !gapPocket(world, 'T', ball)) {
      ball.y = T + r;
      if (ball.vy < 0) {
        var impactT = -ball.vy;
        ball.vy = -ball.vy * e;
        if (Math.abs(ball.vy) < 10) ball.vy = 0;
        if (world.friction > 0) ball.vx *= 0.94;
        noteHit(world, impactT, ball.x, T, 'wall');
      }
    }
    if (ball.y > B - r && !gapPocket(world, 'B', ball)) {
      ball.y = B - r;
      if (ball.vy > 0) {
        var impactB = ball.vy;
        ball.vy = -ball.vy * e;
        if (Math.abs(ball.vy) < 10) ball.vy = 0;
        if (world.friction > 0) ball.vx *= 0.94;
        noteHit(world, impactB, ball.x, B, 'wall');
      }
    }

    for (var i = 0; i < world.pockets.length; i++) {
      var p = world.pockets[i];
      if (hypot(ball.x - p.x, ball.y - p.y) <= pocketReach(p, ball.r)) {
        capture(world, ball, p);
        return;
      }
    }

    var outside = ball.x < L || ball.x > R || ball.y < T || ball.y > B;
    if (!outside) return;
    var best = null;
    var bestD = 1e9;
    for (var j = 0; j < world.pockets.length; j++) {
      var pk = world.pockets[j];
      var d = hypot(ball.x - pk.x, ball.y - pk.y);
      if (d < bestD) { bestD = d; best = pk; }
    }
    if (best && bestD <= best.mouth + r * 0.35) {
      capture(world, ball, best);
      return;
    }
    if (ball.x < L + r) {
      ball.x = L + r;
      if (ball.vx < 0) ball.vx = -ball.vx * e;
    }
    if (ball.x > R - r) {
      ball.x = R - r;
      if (ball.vx > 0) ball.vx = -ball.vx * e;
    }
    if (ball.y < T + r) {
      ball.y = T + r;
      if (ball.vy < 0) ball.vy = -ball.vy * e;
    }
    if (ball.y > B - r) {
      ball.y = B - r;
      if (ball.vy > 0) ball.vy = -ball.vy * e;
    }
    clampSpeed(ball);
  }

  function substep(world, dt) {
    var balls = world.balls;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (!b.alive) continue;
      applyFriction(world, b, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    for (var iter = 0; iter < 6; iter++) {
      for (var a = 0; a < balls.length; a++) {
        for (var c = a + 1; c < balls.length; c++) resolveBallBall(world, balls[a], balls[c]);
      }
      for (var k = 0; k < balls.length; k++) {
        if (!balls[k].alive) continue;
        for (var u = 0; u < world.bumpers.length; u++) resolveBumper(world, balls[k], world.bumpers[u]);
      }
      for (var w = 0; w < balls.length; w++) resolveWalls(world, balls[w]);
    }
    world.time += dt;
  }

  function step(world, dt) {
    if (!(dt > 0)) return;
    if (dt > 0.05) dt = 0.05;
    var maxV = 1;
    for (var i = 0; i < world.balls.length; i++) {
      if (!world.balls[i].alive) continue;
      var sp = speedOf(world.balls[i]);
      if (sp > maxV) maxV = sp;
    }
    var n = Math.ceil(maxV * dt / 14);
    if (n < 1) n = 1;
    if (n > 10) n = 10;
    var h = dt / n;
    for (var s = 0; s < n; s++) substep(world, h);
  }

  function simulate(world, seconds) {
    var left = seconds;
    while (left > 1e-6) {
      var h = left > 1 / 120 ? 1 / 120 : left;
      step(world, h);
      left -= h;
    }
  }

  function shotVelocity(dx, dy) {
    var len = hypot(dx, dy);
    if (!(len >= MIN_DRAG)) return null;
    var t = (len - MIN_DRAG) / (MAX_DRAG - MIN_DRAG);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    var eased = t * t * (3 - 2 * t);
    var speed = MIN_SHOT + eased * (MAX_SHOT - MIN_SHOT);
    return { vx: dx / len * speed, vy: dy / len * speed, power: eased, speed: speed };
  }

  function launch(world, id, vx, vy) {
    if (!canShoot(world)) return false;
    var b = findBall(world, id);
    if (!b || !b.alive) return false;
    var sp = hypot(vx, vy);
    if (sp < MIN_SHOT * 0.5) return false;
    if (sp > MAX_SHOT) {
      var k = MAX_SHOT / sp;
      vx *= k;
      vy *= k;
      sp = MAX_SHOT;
    }
    b.vx = vx;
    b.vy = vy;
    b.asleep = false;
    b.heading = Math.atan2(vy, vx);
    return true;
  }

  function relax(world) {
    for (var n = 0; n < 16; n++) {
      for (var i = 0; i < world.balls.length; i++) {
        for (var j = i + 1; j < world.balls.length; j++) {
          separatePair(world.balls[i], world.balls[j]);
        }
      }
    }
    for (var k = 0; k < world.balls.length; k++) {
      var b = world.balls[k];
      if (!b.alive) continue;
      b.vx = 0;
      b.vy = 0;
      b.asleep = true;
    }
  }

  function placeBall(world, id, x, y) {
    var b = findBall(world, id);
    if (!b) return false;
    b.x = x;
    b.y = y;
    b.vx = 0;
    b.vy = 0;
    b.alive = true;
    b.pocketed = false;
    b.pocketId = null;
    b.asleep = true;
    relax(world);
    b.vx = 0;
    b.vy = 0;
    b.asleep = true;
    return true;
  }

  function kinetic(world) {
    var e = 0;
    for (var i = 0; i < world.balls.length; i++) {
      var b = world.balls[i];
      if (!b.alive) continue;
      e += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy);
    }
    return e;
  }

  function pocketCount(world) {
    var n = 0;
    for (var i = 0; i < world.events.length; i++) if (world.events[i].type === 'pocket') n++;
    return n;
  }

  function layoutErrors(levelIndex) {
    var errors = [];
    var lv = LEVELS[levelIndex];
    var balls = [{ x: TABLE.cue.x, y: TABLE.cue.y, r: TABLE.ballR, id: 'cue' }];
    for (var i = 0; i < lv.targets.length; i++) {
      balls.push({ x: lv.targets[i].x, y: lv.targets[i].y, r: TABLE.ballR, id: 't' + i });
    }
    for (var a = 0; a < balls.length; a++) {
      var b = balls[a];
      if (b.x < TABLE.L + b.r + 6 || b.x > TABLE.R - b.r - 6 || b.y < TABLE.T + b.r + 6 || b.y > TABLE.B - b.r - 6) {
        errors.push('关卡 ' + levelIndex + ' ' + b.id + ' 出界');
      }
      for (var p = 0; p < POCKETS.length; p++) {
        var pk = POCKETS[p];
        if (hypot(b.x - pk.x, b.y - pk.y) <= pk.capture + b.r * 0.5 + 18) {
          errors.push('关卡 ' + levelIndex + ' ' + b.id + ' 离洞太近 ' + pk.id);
        }
      }
      for (var u = 0; u < lv.bumpers.length; u++) {
        var c = lv.bumpers[u];
        if (hypot(b.x - c.x, b.y - c.y) <= b.r + c.r + 8) {
          errors.push('关卡 ' + levelIndex + ' ' + b.id + ' 碰到挡柱');
        }
      }
      for (var d = a + 1; d < balls.length; d++) {
        var o = balls[d];
        if (hypot(b.x - o.x, b.y - o.y) <= b.r + o.r + 8) {
          errors.push('关卡 ' + levelIndex + ' ' + b.id + ' 和 ' + o.id + ' 叠在一起');
        }
      }
    }
    return errors;
  }

  function boxWorld(opts) {
    opts = opts || {};
    return createWorld({
      L: 0,
      T: 0,
      R: opts.w || 800,
      B: opts.h || 800,
      pockets: opts.pockets || [],
      bumpers: opts.bumpers || [],
      balls: opts.balls,
      restitutionBall: opts.restitutionBall != null ? opts.restitutionBall : 1,
      restitutionWall: opts.restitutionWall != null ? opts.restitutionWall : 1,
      restitutionBumper: opts.restitutionBumper != null ? opts.restitutionBumper : 1,
      friction: opts.friction != null ? opts.friction : 0,
      viscous: opts.viscous != null ? opts.viscous : 0
    });
  }

  function finiteBall(b) {
    return isFinite(b.x) && isFinite(b.y) && isFinite(b.vx) && isFinite(b.vy);
  }

  function selfTest() {
    var errors = [];
    function assert(cond, msg) { if (!cond) errors.push(msg); }

    var tiny = shotVelocity(10, 0);
    assert(tiny === null, '短拖动应该取消，不算一发');
    var shot = shotVelocity(0, -220);
    assert(shot && shot.vy < 0 && shot.vx === 0, '向上拖应该朝上打');
    assert(shot.speed >= MIN_SHOT && shot.speed <= MAX_SHOT + 0.01, '出射速度超出范围');
    var hard = shotVelocity(0, -5000);
    assert(hard && Math.abs(hard.speed - MAX_SHOT) < 1e-6, '拖很远也不该超过最大力度');

    for (var li = 0; li < LEVELS.length; li++) {
      var le = layoutErrors(li);
      for (var ei = 0; ei < le.length; ei++) errors.push(le[ei]);
      assert(LEVELS[li].shots >= 5, '发数太少，小朋友不够打');
    }

    // 对心碰撞，等质量，恢复系数 1：速度交换
    var head = boxWorld({
      restitutionBall: 1,
      balls: [
        { id: 'a', x: 200, y: 400, r: 30, vx: 120, vy: 0, mass: 100, asleep: false },
        { id: 'b', x: 200 + 60.2, y: 400, r: 30, vx: -120, vy: 0, mass: 100, asleep: false }
      ]
    });
    simulate(head, 0.4);
    var ha = findBall(head, 'a');
    var hb = findBall(head, 'b');
    assert(ha.vx < -80 && ha.vx > -150, '对心碰撞后左边弹珠速度不对 ' + ha.vx);
    assert(hb.vx > 80 && hb.vx < 150, '对心碰撞后右边弹珠速度不对 ' + hb.vx);
    assert(hypot(ha.x - hb.x, ha.y - hb.y) >= ha.r + hb.r - 1.5, '对心碰撞后还叠在一起');
    assert(kinetic(head) < 0.5 * 100 * (120 * 120 + 120 * 120) * 1.08, '对心碰撞动能变大了');

    // 墙面反弹，不穿过去
    var wall = boxWorld({
      restitutionWall: 0.8,
      balls: [{ id: 'a', x: 36, y: 400, r: 30, vx: -300, vy: 0, asleep: false }]
    });
    simulate(wall, 0.25);
    var wa = findBall(wall, 'a');
    assert(wa.alive, '撞墙不该消失');
    assert(wa.x >= 30 - 1, '弹珠穿过左墙了 ' + wa.x);
    assert(wa.vx > 180 && wa.vx < 260, '撞墙反弹速度不对 ' + wa.vx);

    // 极快也不穿墙
    var tunnel = boxWorld({
      restitutionWall: 0.5,
      balls: [{ id: 'a', x: 40, y: 400, r: 24, vx: -4800, vy: 40, asleep: false }]
    });
    simulate(tunnel, 0.2);
    var ta = findBall(tunnel, 'a');
    assert(ta.alive && ta.x >= 24 - 1 && ta.x <= 800 - 24 + 1, '高速弹珠穿出桌子 ' + ta.x);
    assert(ta.y >= 24 - 1 && ta.y <= 800 - 24 + 1, '高速弹珠穿出上下边 ' + ta.y);
    assert(finiteBall(ta), '高速弹珠出现非数字');

    // 重叠分开，不凭空加速
    var overlap = boxWorld({
      restitutionBall: 0.8,
      friction: 80,
      viscous: 0.2,
      balls: [
        { id: 'a', x: 400, y: 400, r: 40, vx: 0, vy: 0, mass: 100 },
        { id: 'b', x: 430, y: 400, r: 40, vx: 0, vy: 0, mass: 100 }
      ]
    });
    simulate(overlap, 0.6);
    var oa = findBall(overlap, 'a');
    var ob = findBall(overlap, 'b');
    assert(hypot(oa.x - ob.x, oa.y - ob.y) >= 80 - 2, '重叠没有分开');
    assert(speedOf(oa) < 40 && speedOf(ob) < 40, '静止重叠被弹飞了');

    // 摩擦让球停住，停住后不再抖
    var slide = boxWorld({
      friction: 260,
      viscous: 0.8,
      balls: [{ id: 'a', x: 400, y: 400, r: 30, vx: 420, vy: -80, asleep: false }]
    });
    simulate(slide, 4);
    var sa = findBall(slide, 'a');
    assert(sa.asleep && speedOf(sa) === 0, '摩擦后没有睡稳');
    var sx = sa.x, sy = sa.y;
    simulate(slide, 1.2);
    assert(sa.x === sx && sa.y === sy && speedOf(sa) === 0, '睡稳之后还在抖');

    // 静止球一直不动
    var rest = boxWorld({
      balls: [{ id: 'a', x: 400, y: 420, r: 30, vx: 0, vy: 0 }]
    });
    simulate(rest, 2);
    var ra = findBall(rest, 'a');
    assert(ra.x === 400 && ra.y === 420 && ra.vx === 0 && ra.vy === 0, '静止弹珠自己动了');

    // 进洞只记一次
    var pocket = createWorld({
      L: 0, T: 0, R: 400, B: 400,
      pockets: [{ id: 'tc', x: 200, y: 0, r: 40, capture: 36, mouth: 50, sides: ['T'], bonus: true }],
      balls: [{ id: 't', role: 'target', x: 200, y: 10, r: 20 }],
      friction: 0, viscous: 0, restitutionWall: 0.2
    });
    step(pocket, 1 / 60);
    var pb = findBall(pocket, 't');
    assert(!pb.alive && pb.pocketed && pb.pocketId === 'tc', '进洞没有收掉弹珠');
    assert(pocketCount(pocket) === 1, '进洞没有记分事件');
    step(pocket, 1 / 60);
    step(pocket, 1 / 60);
    assert(pocketCount(pocket) === 1, '同一颗弹珠进洞记了多次');
    assert(pb.x === 200 && pb.vx === 0, '进洞之后还在移动');

    // 滚动中不能再打，停稳后可以
    var lock = boxWorld({
      friction: 0,
      viscous: 0,
      balls: [{ id: 'cue', role: 'cue', x: 400, y: 400, r: 30, vx: 0, vy: 0 }]
    });
    assert(launch(lock, 'cue', 0, -800) === true, '停稳时应该打得出去');
    assert(launch(lock, 'cue', 0, -800) === false, '还在滚时不该连打');
    assert(canShoot(lock) === false, '飞出之后仍显示可以打');
    var cue = findBall(lock, 'cue');
    cue.vx = 0;
    cue.vy = 0;
    cue.asleep = true;
    assert(canShoot(lock) === true, '停稳后应该可以打下一发');
    assert(launch(lock, 'missing', 0, -800) === false, '不存在的弹珠不该被打出');

    // 封闭桌里动能不失控
    var hot = boxWorld({
      w: 700,
      h: 700,
      restitutionBall: 0.92,
      restitutionWall: 0.85,
      friction: 0,
      viscous: 0,
      balls: [
        { id: 'a', x: 180, y: 200, r: 28, vx: 260, vy: 140, mass: 80, asleep: false },
        { id: 'b', x: 360, y: 240, r: 28, vx: -220, vy: 80, mass: 80, asleep: false },
        { id: 'c', x: 250, y: 420, r: 28, vx: 90, vy: -240, mass: 80, asleep: false },
        { id: 'd', x: 480, y: 460, r: 28, vx: -160, vy: -120, mass: 80, asleep: false }
      ]
    });
    var e0 = kinetic(hot);
    var eMax = e0;
    for (var n = 0; n < 240; n++) {
      step(hot, 1 / 120);
      var ek = kinetic(hot);
      if (ek > eMax) eMax = ek;
      for (var bi = 0; bi < hot.balls.length; bi++) {
        var bb = hot.balls[bi];
        if (!finiteBall(bb)) errors.push('多球模拟出现非数字');
        if (bb.alive && (bb.x < 28 - 1 || bb.x > 700 - 28 + 1 || bb.y < 28 - 1 || bb.y > 700 - 28 + 1)) {
          errors.push('多球模拟穿出边界 ' + bb.id);
          break;
        }
      }
    }
    assert(eMax < e0 * 1.12, '碰撞让动能越来越大 ' + eMax + ' / ' + e0);

    // 有摩擦时最终会停
    var cool = boxWorld({
      w: 900,
      h: 900,
      restitutionBall: 0.8,
      restitutionWall: 0.65,
      friction: 200,
      viscous: 0.6,
      balls: [
        { id: 'a', x: 200, y: 200, r: 36, vx: 700, vy: 200, asleep: false },
        { id: 'b', x: 420, y: 300, r: 36, vx: -400, vy: 350, asleep: false },
        { id: 'c', x: 300, y: 520, r: 36, vx: 120, vy: -600, asleep: false }
      ]
    });
    simulate(cool, 8);
    assert(canShoot(cool), '摩擦桌面没有让弹珠停稳');

    // 挡柱会把球弹开，速度不超过来速太多
    var bump = boxWorld({
      restitutionBumper: 0.9,
      bumpers: [{ x: 400, y: 400, r: 40 }],
      balls: [{ id: 'a', x: 400, y: 250, r: 30, vx: 0, vy: 300, asleep: false }]
    });
    simulate(bump, 0.5);
    var ba = findBall(bump, 'a');
    assert(ba.y + ba.r <= 400 + 2 || ba.vy < 0, '没有被挡柱挡住');
    assert(speedOf(ba) < 340, '挡柱把球越弹越快 ' + speedOf(ba));
    assert(hypot(ba.x - 400, ba.y - 400) >= ba.r + 40 - 1, '球卡在挡柱里面');

    // 第一关朝上打，会碰到彩色弹珠，而且不飞出桌子
    var play = tableWorld(0, { friction: 180, viscous: 0.4, restitutionBall: 0.86, restitutionWall: 0.72 });
    var beforeY = findBall(play, 't0').y;
    assert(launch(play, 'cue', 0, -1100) === true, '第一关打不出去');
    simulate(play, 3.5);
    var moved = false;
    for (var ti = 0; ti < play.balls.length; ti++) {
      var tb = play.balls[ti];
      assert(finiteBall(tb), '第一关出现非数字');
      if (!tb.alive) continue;
      assert(tb.x > TABLE.L - tb.r && tb.x < TABLE.R + tb.r, '第一关弹珠横向跑出桌子');
      assert(tb.y > TABLE.T - tb.r && tb.y < TABLE.B + tb.r, '第一关弹珠纵向跑出桌子');
      if (tb.role === 'target' && (tb.pocketed || Math.abs(tb.y - beforeY) > 6 || Math.abs(tb.x - LEVELS[0].targets[Number(String(tb.id).slice(1))].x) > 6)) {
        moved = true;
      }
    }
    var hitBall = false;
    for (var ev = 0; ev < play.events.length; ev++) if (play.events[ev].kind === 'ball') hitBall = true;
    assert(hitBall || moved, '朝上打没有碰到彩色弹珠');

    var live = tableWorld(0);
    assert(launch(live, 'cue', 0, -1500) === true, '默认桌面打不出去');
    simulate(live, 5);
    var got = 0;
    for (var pi = 0; pi < live.balls.length; pi++) {
      if (live.balls[pi].role === 'target' && live.balls[pi].pocketed) got++;
    }
    assert(got >= 1, '正中全力一击至少要进一颗，实际 ' + got);
    var cueLive = findBall(live, 'cue');
    assert(finiteBall(cueLive), '默认一击后母球坏了');
    assert(pocketCount(live) === got + (cueLive.pocketed ? 1 : 0), '进洞次数和收掉的弹珠对不上');

    // 母球进洞后可以放回，且只记一次
    var scratch = tableWorld(0, { friction: 0, viscous: 0 });
    var cue0 = findBall(scratch, 'cue');
    cue0.x = POCKETS[1].x;
    cue0.y = POCKETS[1].y + 20;
    cue0.vx = 0;
    cue0.vy = -40;
    cue0.asleep = false;
    simulate(scratch, 0.4);
    assert(findBall(scratch, 'cue').pocketed, '母球掉进洞口没有被收走');
    var pocketsBefore = pocketCount(scratch);
    assert(placeBall(scratch, 'cue', TABLE.cue.x, TABLE.cue.y), '母球没有放回来');
    var cueBack = findBall(scratch, 'cue');
    assert(cueBack.alive && !cueBack.pocketed, '放回来的母球还是进洞状态');
    simulate(scratch, 0.3);
    assert(pocketCount(scratch) === pocketsBefore, '放回来之后又记了一次进洞');

    return { ok: errors.length === 0, errors: errors, checks: 18 + LEVELS.length };
  }

  return {
    SLEEP: SLEEP,
    MAX_SPEED: MAX_SPEED,
    MIN_DRAG: MIN_DRAG,
    MAX_DRAG: MAX_DRAG,
    MIN_SHOT: MIN_SHOT,
    MAX_SHOT: MAX_SHOT,
    TABLE: TABLE,
    POCKETS: POCKETS,
    LEVELS: LEVELS,
    createWorld: createWorld,
    createBall: createBall,
    tableWorld: tableWorld,
    step: step,
    simulate: simulate,
    canShoot: canShoot,
    launch: launch,
    shotVelocity: shotVelocity,
    placeBall: placeBall,
    relax: relax,
    kinetic: kinetic,
    findBall: findBall,
    layoutErrors: layoutErrors,
    selfTest: selfTest
  };
});
