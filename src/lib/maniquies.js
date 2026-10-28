// ============================================================
// Maniquíes (ilustraciones) — PORTADO de la app de escritorio
// (src/maniquies.js). Los dibujos SVG son EXACTAMENTE los mismos;
// lo único que cambia es que antes se colgaban de window.MANIQUIES
// y aquí se exportan como módulo para Next.js.
//
// Los colores NO están aquí: se definen por CLASE (.mq-base, .mq-ear…)
// en globals.css. Sin esas clases el dibujo se vería negro.
//
// Las dos especies comparten el MISMO viewBox (0 0 380 660) para que
// un punto guardado en (x%, y%) quede en el mismo sitio aunque cambies
// de perro a gato.
// ============================================================

const VIEWBOX = '0 0 380 660';

// -------------------- PERRO (hembra, vista ventral) --------------------
const PERRO = `
<svg viewBox="${VIEWBOX}" preserveAspectRatio="xMidYMid meet" class="mq-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Maniquí de perro en vista ventral">
  <g class="mq-cuerpo">
    <path class="mq-base" d="M198 530 C228 550 248 578 252 602 C255 622 248 638 238 642 C232 630 230 616 222 600 C212 580 198 560 184 544 Z"/>
    <path class="mq-ear" d="M226 82 C250 86 266 102 268 124 C269 144 260 160 246 160 C234 160 226 146 223 128 C221 112 221 94 226 82 Z"/>
    <path class="mq-ear" d="M154 82 C130 86 114 102 112 124 C111 144 120 160 134 160 C146 160 154 146 157 128 C159 112 159 94 154 82 Z"/>
    <path class="mq-limb-o" stroke-width="30" d="M240 216 Q270 182 286 150 Q298 126 310 106"/>
    <path class="mq-limb-f" stroke-width="26" d="M240 216 Q270 182 286 150 Q298 126 310 106"/>
    <path class="mq-limb-o" stroke-width="30" d="M140 216 Q110 182 94 150 Q82 126 70 106"/>
    <path class="mq-limb-f" stroke-width="26" d="M140 216 Q110 182 94 150 Q82 126 70 106"/>
    <path class="mq-limb-o" stroke-width="34" d="M238 468 Q282 502 294 540 Q302 564 306 586"/>
    <path class="mq-limb-f" stroke-width="30" d="M238 468 Q282 502 294 540 Q302 564 306 586"/>
    <path class="mq-limb-o" stroke-width="34" d="M142 468 Q98 502 86 540 Q78 564 74 586"/>
    <path class="mq-limb-f" stroke-width="30" d="M142 468 Q98 502 86 540 Q78 564 74 586"/>
    <ellipse class="mq-base" cx="312" cy="100" rx="15" ry="19" transform="rotate(-32 312 100)"/>
    <ellipse class="mq-base" cx="68" cy="100" rx="15" ry="19" transform="rotate(32 68 100)"/>
    <ellipse class="mq-base" cx="308" cy="592" rx="16" ry="20" transform="rotate(-14 308 592)"/>
    <ellipse class="mq-base" cx="72" cy="592" rx="16" ry="20" transform="rotate(14 72 592)"/>
    <g class="mq-pad" transform="rotate(-32 312 100)">
      <ellipse cx="312" cy="105" rx="7.5" ry="9"/>
      <circle cx="302" cy="90" r="3.4"/><circle cx="308.5" cy="86" r="3.4"/><circle cx="315.5" cy="86.5" r="3.4"/><circle cx="321" cy="91.5" r="3.4"/>
    </g>
    <g class="mq-pad" transform="rotate(32 68 100)">
      <ellipse cx="68" cy="105" rx="7.5" ry="9"/>
      <circle cx="78" cy="90" r="3.4"/><circle cx="71.5" cy="86" r="3.4"/><circle cx="64.5" cy="86.5" r="3.4"/><circle cx="59" cy="91.5" r="3.4"/>
    </g>
    <g class="mq-pad" transform="rotate(-14 308 592)">
      <ellipse cx="308" cy="598" rx="8" ry="9.5"/>
      <circle cx="297" cy="582" r="3.6"/><circle cx="304" cy="578" r="3.6"/><circle cx="312" cy="578.5" r="3.6"/><circle cx="318" cy="584" r="3.6"/>
    </g>
    <g class="mq-pad" transform="rotate(14 72 592)">
      <ellipse cx="72" cy="598" rx="8" ry="9.5"/>
      <circle cx="83" cy="582" r="3.6"/><circle cx="76" cy="578" r="3.6"/><circle cx="68" cy="578.5" r="3.6"/><circle cx="62" cy="584" r="3.6"/>
    </g>
    <path class="mq-base" d="M190 38 C206 38 214 46 214 60 C214 74 228 84 240 98 C248 108 246 124 236 136 C230 144 226 150 224 158 C224 174 238 184 250 198 C260 210 266 228 268 252 C270 272 268 292 264 312 C260 336 254 356 252 378 C250 398 252 416 256 436 C260 452 260 468 256 484 C252 502 240 518 226 528 C214 536 202 542 190 542 C178 542 166 536 154 528 C140 518 128 502 124 484 C120 468 120 452 124 436 C128 416 130 398 128 378 C126 356 120 336 116 312 C112 292 110 272 112 252 C114 228 120 210 130 198 C142 184 156 174 156 158 C154 150 150 144 144 136 C134 124 132 108 140 98 C152 84 166 74 166 60 C166 46 174 38 190 38 Z"/>
    <ellipse class="mq-belly" cx="190" cy="74" rx="13" ry="19"/>
    <path class="mq-shade" d="M190 200 C197 226 197 264 190 298 C183 264 183 226 190 200 Z"/>
    <path class="mq-belly" d="M190 300 C232 304 248 340 246 384 C244 424 232 462 190 470 C148 462 136 424 134 384 C132 340 148 304 190 300 Z"/>
    <ellipse class="mq-tone2" cx="190" cy="392" rx="33" ry="55"/>
    <ellipse class="mq-shade" cx="238" cy="230" rx="8" ry="14" transform="rotate(-38 238 230)"/>
    <ellipse class="mq-shade" cx="142" cy="230" rx="8" ry="14" transform="rotate(38 142 230)"/>
    <ellipse class="mq-shade" cx="234" cy="484" rx="8" ry="14" transform="rotate(34 234 484)"/>
    <ellipse class="mq-shade" cx="146" cy="484" rx="8" ry="14" transform="rotate(-34 146 484)"/>
    <ellipse class="mq-pad" cx="190" cy="45" rx="10.5" ry="7.5"/>
    <circle class="mq-darkest" cx="185.5" cy="44" r="1.6"/><circle class="mq-darkest" cx="194.5" cy="44" r="1.6"/>
    <path class="mq-line" d="M178 60 Q190 66 202 60"/>
    <path class="mq-dark" d="M190 504 C193.5 509 193.5 517 190 522 C186.5 517 186.5 509 190 504 Z"/>
  </g>
  <g class="mq-guias">
    <line class="mq-mid" x1="190" y1="150" x2="190" y2="528"/>
    <path class="mq-guia" d="M190 298 C166 290 146 270 138 242"/>
    <path class="mq-guia" d="M190 298 C214 290 234 270 242 242"/>
    <path class="mq-guia" d="M152 216 C172 228 208 228 228 216"/>
    <path class="mq-guia" d="M148 246 C170 259 210 259 232 246"/>
    <circle class="mq-guia" cx="190" cy="346" r="4"/>
    <path class="mq-guia" d="M174 498 C182 505 198 505 206 498"/>
    <circle class="mq-teat" cx="162" cy="258" r="3"/><circle class="mq-teat" cx="218" cy="258" r="3"/>
    <circle class="mq-teat" cx="157" cy="306" r="3"/><circle class="mq-teat" cx="223" cy="306" r="3"/>
    <circle class="mq-teat" cx="155" cy="354" r="3"/><circle class="mq-teat" cx="225" cy="354" r="3"/>
    <circle class="mq-teat" cx="159" cy="402" r="3"/><circle class="mq-teat" cx="221" cy="402" r="3"/>
    <circle class="mq-teat" cx="166" cy="446" r="3"/><circle class="mq-teat" cx="214" cy="446" r="3"/>
  </g>
</svg>`;

// -------------------- GATO (hembra, vista ventral) --------------------
const GATO = `
<svg viewBox="${VIEWBOX}" preserveAspectRatio="xMidYMid meet" class="mq-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Maniquí de gato en vista ventral">
  <g class="mq-cuerpo">
    <path class="mq-base" d="M196 528 C224 546 240 572 238 598 C236 624 214 640 186 640 C164 640 148 628 144 612 C152 622 166 630 184 630 C206 630 224 616 226 596 C228 574 212 550 186 536 Z"/>
    <path class="mq-base" d="M206 64 C220 44 238 26 250 20 C256 17 260 22 258 28 C252 48 242 70 232 84 Z"/>
    <path class="mq-base" d="M174 64 C160 44 142 26 130 20 C124 17 120 22 122 28 C128 48 138 70 148 84 Z"/>
    <path class="mq-shade" d="M216 60 C226 46 238 34 246 28 C242 42 234 58 228 70 Z"/>
    <path class="mq-shade" d="M164 60 C154 46 142 34 134 28 C138 42 146 58 152 70 Z"/>
    <path class="mq-limb-o" stroke-width="22" d="M232 206 Q258 176 270 148 Q280 126 290 108"/>
    <path class="mq-limb-f" stroke-width="18" d="M232 206 Q258 176 270 148 Q280 126 290 108"/>
    <path class="mq-limb-o" stroke-width="22" d="M148 206 Q122 176 110 148 Q100 126 90 108"/>
    <path class="mq-limb-f" stroke-width="18" d="M148 206 Q122 176 110 148 Q100 126 90 108"/>
    <path class="mq-limb-o" stroke-width="26" d="M230 462 Q264 494 274 530 Q280 554 284 572"/>
    <path class="mq-limb-f" stroke-width="22" d="M230 462 Q264 494 274 530 Q280 554 284 572"/>
    <path class="mq-limb-o" stroke-width="26" d="M150 462 Q116 494 106 530 Q100 554 96 572"/>
    <path class="mq-limb-f" stroke-width="22" d="M150 462 Q116 494 106 530 Q100 554 96 572"/>
    <ellipse class="mq-base" cx="292" cy="102" rx="11.5" ry="14.5" transform="rotate(-30 292 102)"/>
    <ellipse class="mq-base" cx="88" cy="102" rx="11.5" ry="14.5" transform="rotate(30 88 102)"/>
    <ellipse class="mq-base" cx="286" cy="578" rx="12.5" ry="15.5" transform="rotate(-12 286 578)"/>
    <ellipse class="mq-base" cx="94" cy="578" rx="12.5" ry="15.5" transform="rotate(12 94 578)"/>
    <g class="mq-pad" transform="rotate(-30 292 102)">
      <ellipse cx="292" cy="106" rx="5.5" ry="6.5"/>
      <circle cx="284" cy="94" r="2.6"/><circle cx="289.5" cy="90.5" r="2.6"/><circle cx="295" cy="91" r="2.6"/><circle cx="299.5" cy="95" r="2.6"/>
    </g>
    <g class="mq-pad" transform="rotate(30 88 102)">
      <ellipse cx="88" cy="106" rx="5.5" ry="6.5"/>
      <circle cx="96" cy="94" r="2.6"/><circle cx="90.5" cy="90.5" r="2.6"/><circle cx="85" cy="91" r="2.6"/><circle cx="80.5" cy="95" r="2.6"/>
    </g>
    <g class="mq-pad" transform="rotate(-12 286 578)">
      <ellipse cx="286" cy="583" rx="6" ry="7"/>
      <circle cx="277" cy="570" r="2.8"/><circle cx="283" cy="566.5" r="2.8"/><circle cx="289.5" cy="567" r="2.8"/><circle cx="294.5" cy="571" r="2.8"/>
    </g>
    <g class="mq-pad" transform="rotate(12 94 578)">
      <ellipse cx="94" cy="583" rx="6" ry="7"/>
      <circle cx="103" cy="570" r="2.8"/><circle cx="97" cy="566.5" r="2.8"/><circle cx="90.5" cy="567" r="2.8"/><circle cx="85.5" cy="571" r="2.8"/>
    </g>
    <path class="mq-base" d="M190 52 C212 52 228 66 230 88 C231 104 224 118 214 128 C210 136 208 142 208 150 C210 164 220 174 230 188 C240 200 246 218 248 240 C250 262 248 284 246 306 C243 330 240 352 240 374 C240 396 242 414 246 432 C249 448 249 464 246 478 C242 496 232 512 220 522 C208 530 200 536 190 536 C180 536 172 530 160 522 C148 512 138 496 134 478 C131 464 131 448 134 432 C138 414 140 396 140 374 C140 352 137 330 134 306 C132 284 130 262 132 240 C134 218 140 200 150 188 C160 174 170 164 172 150 C172 142 170 136 166 128 C156 118 149 104 150 88 C152 66 168 52 190 52 Z"/>
    <ellipse class="mq-belly" cx="190" cy="100" rx="10" ry="13"/>
    <path class="mq-shade" d="M190 194 C196 218 196 258 190 292 C184 258 184 218 190 194 Z"/>
    <path class="mq-belly" d="M190 296 C222 300 234 330 233 372 C232 410 222 446 190 454 C158 446 148 410 147 372 C146 330 158 300 190 296 Z"/>
    <ellipse class="mq-tone2" cx="190" cy="380" rx="25" ry="46"/>
    <ellipse class="mq-shade" cx="230" cy="218" rx="6.5" ry="11" transform="rotate(-38 230 218)"/>
    <ellipse class="mq-shade" cx="150" cy="218" rx="6.5" ry="11" transform="rotate(38 150 218)"/>
    <ellipse class="mq-shade" cx="226" cy="476" rx="6.5" ry="11" transform="rotate(34 226 476)"/>
    <ellipse class="mq-shade" cx="154" cy="476" rx="6.5" ry="11" transform="rotate(-34 154 476)"/>
    <path class="mq-dark" d="M190 68 L196.5 74.5 Q190 80.5 183.5 74.5 Z"/>
    <path class="mq-line" d="M181 84 Q190 90 199 84"/>
    <path class="mq-line" d="M206 88 Q234 80 256 72"/>
    <path class="mq-line" d="M208 96 Q238 93 260 91"/>
    <path class="mq-line" d="M206 104 Q234 108 256 114"/>
    <path class="mq-line" d="M174 88 Q146 80 124 72"/>
    <path class="mq-line" d="M172 96 Q142 93 120 91"/>
    <path class="mq-line" d="M174 104 Q146 108 124 114"/>
    <path class="mq-dark" d="M190 500 C193 504.5 193 511.5 190 516 C187 511.5 187 504.5 190 500 Z"/>
  </g>
  <g class="mq-guias">
    <line class="mq-mid" x1="190" y1="140" x2="190" y2="524"/>
    <path class="mq-guia" d="M190 292 C170 285 152 266 146 240"/>
    <path class="mq-guia" d="M190 292 C210 285 228 266 234 240"/>
    <path class="mq-guia" d="M158 212 C176 223 204 223 222 212"/>
    <path class="mq-guia" d="M154 242 C174 254 206 254 226 242"/>
    <circle class="mq-guia" cx="190" cy="340" r="3.5"/>
    <path class="mq-guia" d="M176 490 C183 496 197 496 204 490"/>
    <circle class="mq-teat" cx="166" cy="262" r="2.7"/><circle class="mq-teat" cx="214" cy="262" r="2.7"/>
    <circle class="mq-teat" cx="162" cy="308" r="2.7"/><circle class="mq-teat" cx="218" cy="308" r="2.7"/>
    <circle class="mq-teat" cx="162" cy="354" r="2.7"/><circle class="mq-teat" cx="218" cy="354" r="2.7"/>
    <circle class="mq-teat" cx="166" cy="398" r="2.7"/><circle class="mq-teat" cx="214" cy="398" r="2.7"/>
  </g>
</svg>`;

// ==================== VISTAS LATERALES (perfil de pie) ====================
// Dibujadas con la cabeza a la IZQUIERDA => se ve el LADO IZQUIERDO del
// animal. El lado derecho es el MISMO dibujo reflejado (espejo), con lo
// que ambos laterales siempre coinciden. viewBox apaisado 660x380.
const VIEWBOX_LADO = '0 0 660 380';

const PERRO_LADO_INNER = `
  <g class="mq-cuerpo">
    <path class="mq-limb-o" stroke-width="20" d="M 486 112 Q 540 92 588 52"/>
    <path class="mq-limb-f" stroke-width="16" d="M 486 112 Q 540 92 588 52"/>
    <path class="mq-limb-o" stroke-width="26" d="M 276 230 L 272 330"/>
    <path class="mq-limb-far" stroke-width="22" d="M 276 230 L 272 330"/>
    <ellipse class="mq-ear" cx="272" cy="336" rx="14" ry="8"/>
    <path class="mq-limb-o" stroke-width="26" d="M 508 232 Q 520 270 512 300 Q 508 318 510 330"/>
    <path class="mq-limb-far" stroke-width="22" d="M 508 232 Q 520 270 512 300 Q 508 318 510 330"/>
    <ellipse class="mq-ear" cx="512" cy="336" rx="14" ry="8"/>
    <path class="mq-base" d="M 48 160 C 46 150 52 142 64 140 C 88 132 108 122 126 110 C 140 100 158 94 176 96 C 196 98 210 104 224 102 C 248 96 272 96 296 102 C 330 110 370 108 408 104 C 432 101 456 100 476 104 C 500 109 516 122 522 144 C 527 164 526 186 520 206 C 516 220 512 232 510 244 C 496 240 484 234 472 228 C 448 222 424 218 400 214 C 372 208 348 212 324 222 C 300 232 276 244 254 248 C 232 250 214 244 202 232 C 190 218 184 202 182 186 C 172 178 160 174 148 172 C 124 170 100 170 80 168 C 66 168 54 166 48 160 Z"/>
    <ellipse class="mq-belly" cx="350" cy="226" rx="118" ry="20"/>
    <ellipse class="mq-tone2" cx="350" cy="228" rx="70" ry="12"/>
    <ellipse class="mq-shade" cx="250" cy="172" rx="26" ry="42"/>
    <ellipse class="mq-shade" cx="492" cy="172" rx="32" ry="50"/>
    <path class="mq-line" d="M 196 118 C 204 150 206 180 200 210"/>
    <path class="mq-ear" d="M 160 100 C 184 98 200 110 202 132 C 203 152 194 164 180 162 C 166 160 156 146 154 128 C 153 116 155 106 160 100 Z"/>
    <path class="mq-limb-o" stroke-width="30" d="M 236 240 L 232 330"/>
    <path class="mq-limb-f" stroke-width="26" d="M 236 240 L 232 330"/>
    <ellipse class="mq-base" cx="233" cy="337" rx="16" ry="9"/>
    <path class="mq-limb-o" stroke-width="34" d="M 494 220 Q 506 262 492 294 Q 486 314 488 330"/>
    <path class="mq-limb-f" stroke-width="30" d="M 494 220 Q 506 262 492 294 Q 486 314 488 330"/>
    <ellipse class="mq-base" cx="490" cy="337" rx="17" ry="9"/>
    <circle class="mq-dark" cx="112" cy="138" r="5"/>
    <ellipse class="mq-pad" cx="54" cy="148" rx="8" ry="6"/>
    <path class="mq-line" d="M 56 168 Q 76 176 96 172"/>
  </g>
  <g class="mq-guias">
    <path class="mq-guia" d="M 296 122 C 282 158 282 200 296 234"/>
    <path class="mq-guia" d="M 330 124 C 318 160 318 200 330 232"/>
    <path class="mq-guia" d="M 364 124 C 354 160 354 198 364 228"/>
    <path class="mq-guia" d="M 240 112 C 256 146 258 182 246 214"/>
    <circle class="mq-guia" cx="488" cy="138" r="9"/>
    <path class="mq-guia" d="M 380 214 C 402 196 432 186 462 182"/>
    <circle class="mq-guia" cx="262" cy="238" r="5"/>
    <circle class="mq-guia" cx="474" cy="224" r="5"/>
  </g>`;

const GATO_LADO_INNER = `
  <g class="mq-cuerpo">
    <path class="mq-limb-o" stroke-width="14" d="M 476 116 Q 530 96 566 48"/>
    <path class="mq-limb-f" stroke-width="10" d="M 476 116 Q 530 96 566 48"/>
    <path class="mq-limb-o" stroke-width="20" d="M 256 224 L 252 328"/>
    <path class="mq-limb-far" stroke-width="16" d="M 256 224 L 252 328"/>
    <ellipse class="mq-ear" cx="252" cy="334" rx="11" ry="7"/>
    <path class="mq-limb-o" stroke-width="22" d="M 484 228 Q 494 264 488 296 Q 485 314 486 328"/>
    <path class="mq-limb-far" stroke-width="18" d="M 484 228 Q 494 264 488 296 Q 485 314 486 328"/>
    <ellipse class="mq-ear" cx="486" cy="334" rx="12" ry="7"/>
    <path class="mq-base" d="M 128 98 C 132 78 140 58 150 44 C 154 39 160 42 160 48 C 160 66 156 84 150 98 Z"/>
    <path class="mq-base" d="M 60 152 C 58 142 64 134 76 132 C 92 124 104 116 116 106 C 126 96 140 90 154 92 C 172 94 184 100 198 102 C 222 100 246 102 270 106 C 310 112 350 112 390 108 C 416 105 440 104 458 108 C 480 113 494 126 498 146 C 502 164 500 186 494 206 C 490 220 488 230 486 240 C 472 236 460 230 448 226 C 424 218 400 214 376 210 C 352 204 330 208 308 216 C 288 224 270 232 252 236 C 234 238 220 232 210 222 C 200 210 196 196 194 182 C 184 172 172 168 160 166 C 136 162 112 160 92 158 C 78 158 66 158 60 152 Z"/>
    <path class="mq-shade" d="M 138 92 C 141 76 146 62 151 52 C 152 66 149 82 145 92 Z"/>
    <ellipse class="mq-belly" cx="330" cy="218" rx="100" ry="16"/>
    <ellipse class="mq-tone2" cx="330" cy="220" rx="58" ry="10"/>
    <ellipse class="mq-shade" cx="240" cy="166" rx="22" ry="38"/>
    <ellipse class="mq-shade" cx="468" cy="168" rx="28" ry="44"/>
    <path class="mq-limb-o" stroke-width="24" d="M 222 232 L 218 330"/>
    <path class="mq-limb-f" stroke-width="20" d="M 222 232 L 218 330"/>
    <ellipse class="mq-base" cx="219" cy="336" rx="13" ry="8"/>
    <path class="mq-limb-o" stroke-width="26" d="M 470 218 Q 482 258 470 290 Q 465 310 466 330"/>
    <path class="mq-limb-f" stroke-width="22" d="M 470 218 Q 482 258 470 290 Q 465 310 466 330"/>
    <ellipse class="mq-base" cx="468" cy="336" rx="14" ry="8"/>
    <circle class="mq-dark" cx="104" cy="132" r="4.5"/>
    <path class="mq-dark" d="M 62 146 L 70 150 Q 64 155 58 150 Z"/>
    <path class="mq-line" d="M 64 160 Q 80 166 96 162"/>
    <path class="mq-line" d="M 92 150 Q 60 144 34 134"/>
    <path class="mq-line" d="M 94 156 Q 62 156 36 152"/>
    <path class="mq-line" d="M 92 162 Q 62 168 38 174"/>
  </g>
  <g class="mq-guias">
    <path class="mq-guia" d="M 276 122 C 264 154 264 192 276 224"/>
    <path class="mq-guia" d="M 306 124 C 296 156 296 192 306 222"/>
    <path class="mq-guia" d="M 336 124 C 328 156 328 190 336 218"/>
    <path class="mq-guia" d="M 226 112 C 240 142 242 176 232 206"/>
    <circle class="mq-guia" cx="462" cy="136" r="8"/>
    <path class="mq-guia" d="M 352 210 C 374 194 402 186 428 182"/>
    <circle class="mq-guia" cx="244" cy="230" r="4.5"/>
    <circle class="mq-guia" cx="452" cy="216" r="4.5"/>
  </g>`;

function svgLado(inner, espejo, etiqueta) {
  const contenido = espejo
    ? `<g transform="translate(660 0) scale(-1 1)">${inner}</g>`
    : inner;
  return `<svg viewBox="${VIEWBOX_LADO}" preserveAspectRatio="xMidYMid meet" class="mq-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${etiqueta}">${contenido}</svg>`;
}

// -------------------- PERRO: fotos reales (reemplazan el SVG) --------------------
// Igual que las vistas vectoriales, cada entrada define su propia relación de
// aspecto (ancho/alto) — las fotos no tienen por qué compartir la del dibujo
// que reemplazan. .mq-canvas la lee de --mq-ratio (ver ratio() más abajo).
const PERRO_FOTO = {
  ventral: { src: '/maniquies/perro-ventral.png', ratio: 0.6, etiqueta: 'Maniquí de perro en vista ventral' },
  izq: { src: '/maniquies/perro-izq.png', ratio: 2.4, etiqueta: 'Perro — lado izquierdo' },
  der: { src: '/maniquies/perro-der.png', ratio: 2.4, etiqueta: 'Perro — lado derecho' },
};

// -------------------- GATO: fotos reales (reemplazan el SVG) --------------------
const GATO_FOTO = {
  ventral: { src: '/maniquies/gato-ventral.png', ratio: 0.6, etiqueta: 'Maniquí de gato en vista ventral' },
  izq: { src: '/maniquies/gato-izq.png', ratio: 2.4, etiqueta: 'Gato — lado izquierdo' },
  der: { src: '/maniquies/gato-der.png', ratio: 2.4, etiqueta: 'Gato — lado derecho' },
};

function imgArte(foto) {
  return `<img src="${foto.src}" alt="${foto.etiqueta}" class="mq-svg mq-foto" draggable="false" />`;
}

export const MANIQUIES = {
  viewBox: VIEWBOX,
  viewBoxLado: VIEWBOX_LADO,
  perro: PERRO,
  gato: GATO,
  // vista: 'ventral' (por debajo) | 'izq' (lado izquierdo) | 'der' (lado derecho)
  svg(especie, vista) {
    const foto = especie === 'gato' ? GATO_FOTO[vista] : especie === 'perro' ? PERRO_FOTO[vista] : null;
    if (foto) return imgArte(foto);
    const g = especie === 'gato';
    if (vista === 'izq') return svgLado(g ? GATO_LADO_INNER : PERRO_LADO_INNER, false, (g ? 'Gato' : 'Perro') + ' — lado izquierdo');
    if (vista === 'der') return svgLado(g ? GATO_LADO_INNER : PERRO_LADO_INNER, true, (g ? 'Gato' : 'Perro') + ' — lado derecho');
    return g ? GATO : PERRO;
  },
  // Relación ancho/alto del arte actual, para que .mq-canvas (y el cálculo
  // de ancho del panel en vista lateral) se ajusten a ella vía --mq-ratio.
  ratio(especie, vista) {
    const foto = especie === 'gato' ? GATO_FOTO[vista] : especie === 'perro' ? PERRO_FOTO[vista] : null;
    if (foto) return foto.ratio;
    return vista === 'izq' || vista === 'der' ? 660 / 380 : 380 / 660;
  },
  esLado(vista) { return vista === 'izq' || vista === 'der'; },
  nombreVista(vista) {
    return vista === 'izq' ? 'Lado izquierdo' : vista === 'der' ? 'Lado derecho' : 'Por debajo';
  },
  nombre(especie) { return especie === 'gato' ? 'Gato' : 'Perro'; },
};
