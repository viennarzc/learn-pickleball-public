const players = {
  blue: ["Mira", "Jo"],
  violet: ["Leo", "Sam"],
};
const teamNames = { blue: "Blue", violet: "Violet" };
const opponent = (team) => team === "blue" ? "violet" : "blue";
const evenSide = (score) => score % 2 === 0 ? "right" : "left";
const oppositeSide = (side) => side === "right" ? "left" : "right";

const examples = {
  doubles: {
    intro: "Four players, one score call. See when the same player keeps serving, when the serve goes to their partner, and when it goes to the other team.",
    opening: ["Why start at 0–0–2?", "Mira serves from Blue’s right side. Blue gets one server on the opening turn, so Mira calls server number 2. On later turns, each team gets two servers."],
    rallies: [
      ["blue", "Blue scores and switches sides", "Mira won while serving. Blue adds a point, both Blue partners swap sides, and Mira serves again from the left. Violet stays put."],
      ["violet", "Side-out on the opening turn", "Violet won as the receiving team, so no point is added. Mira’s opening turn ends. Leo starts Violet’s turn from the right as server 1. Violet’s score is called first."],
      ["blue", "The serve goes to Leo’s partner", "Leo lost as server 1. Sam becomes server 2 and serves from the left, where Sam already stands. No point is added and nobody switches sides."],
      ["violet", "Sam keeps serving", "Violet adds a point because Sam won on serve. The Violet partners swap sides and Sam serves from the right, still as server 2."],
      ["blue", "Jo serves next", "Sam lost as server 2, so it’s a side-out. Blue’s score stays at 1. Jo is on Blue’s right and starts this turn as server 1. Server numbers belong to the turn, so either partner can be first."],
    ],
    question: "Blue just won the rally while Sam was serving as server 2. Who serves next?",
    choices: [["Mira, from Blue’s left", "Mira", "left"], ["Jo, from Blue’s right", "Jo", "right"], ["Leo, from Violet’s left", "Leo", "left"]],
  },
  singles: {
    intro: "Two players and a two-number score call. Follow the server’s score to find the right service court.",
    opening: ["Start at 0–0", "Mira starts on the right because zero is even. In singles, call the serving player’s score first and the receiving player’s score second."],
    rallies: [
      ["blue", "Mira scores and serves from the left", "Mira won on serve and adds a point. Her score is now 1, an odd number, so she serves from the left and Leo receives diagonally."],
      ["violet", "Leo takes over the serve", "Leo won as the receiver and gains the serve. Both scores stay the same. Leo has 0, so he serves from the right and calls his own score first."],
      ["violet", "An odd score puts Leo on the left", "Leo won on serve and adds a point. His score is now 1, so he serves from the left."],
      ["violet", "An even score puts Leo on the right", "Leo wins on serve again. His score is now 2, so he serves from the right."],
      ["blue", "Mira serves from the left", "Mira won as the receiver, so her score stays at 1. That’s odd, which puts her on the left. She calls her score first: 1–2."],
    ],
    question: "Mira just won as the receiver. Her score is 1 and Leo’s is 2. Who serves next, and from which side?",
    choices: [["Mira, from the right", "Mira", "right"], ["Mira, from the left", "Mira", "left"], ["Leo, from the right", "Leo", "right"]],
  },
};

// Doubles players change sides only when their team scores. The players who
// began on the right are on the right whenever their own team has an even score.
function doublesPlayer(team, score, side) {
  return players[team][side === evenSide(score) ? 0 : 1];
}

function afterRally(state, winner, doubles) {
  const { scores, serving, number, side } = state;
  if (winner === serving) {
    return { scores: { ...scores, [winner]: scores[winner] + 1 }, serving, number, side: oppositeSide(side) };
  }
  if (doubles && number === 1) {
    return { scores, serving, number: 2, side: oppositeSide(side) };
  }
  return { scores, serving: winner, number: 1, side: doubles ? "right" : evenSide(scores[winner]) };
}

function buildSlides(format) {
  const { opening, rallies } = examples[format];
  const doubles = format === "doubles";
  let state = { scores: { blue: 0, violet: 0 }, serving: "blue", number: 2, side: "right" };
  return [opening, ...rallies.map(([_, title, explanation]) => [title, explanation])].map(([title, explanation], index) => {
    if (index > 0) state = afterRally(state, rallies[index - 1][0], doubles);
    const { scores, serving, number, side } = state;
    const receiving = opponent(serving);
    const server = doubles ? doublesPlayer(serving, scores[serving], side) : players[serving][0];
    const court = Object.entries(players).flatMap(([team, names]) => names.slice(0, doubles ? 2 : 1).map((name, index) => ({
      name,
      team,
      side: doubles ? (index === 0 ? evenSide(scores[team]) : oppositeSide(evenSide(scores[team]))) : side,
      serving: name === server,
    })));
    const call = [scores[serving], scores[receiving]];
    if (doubles) call.push(number);
    return { title, explanation, serving, receiving, side, server, call, court };
  });
}

export function renderScoringWalkthrough() {
  return `<section class="scoring-walkthrough page" data-scoring-walkthrough aria-labelledby="scoring-title">
    <h1 id="scoring-title" tabindex="-1">Who serves next?</h1>
    <p class="lede">Follow a few rallies to see who scores, who serves, and where they stand.</p>
    <div class="scoring-formats" role="group" aria-label="Traditional side-out scoring format">
      <button class="button button-secondary" type="button" data-scoring-format="doubles" aria-pressed="true">Doubles</button>
      <button class="button button-secondary" type="button" data-scoring-format="singles" aria-pressed="false">Singles</button>
    </div>
    <div class="scoring-panel">
      <div class="scoring-progress" data-scoring-progress hidden>
        <p data-scoring-count></p>
        <div class="scoring-track" role="progressbar" aria-label="Walkthrough progress" aria-valuemin="1">
          <span class="scoring-ball" aria-hidden="true"></span>
        </div>
      </div>
      <div class="scoring-controls" aria-label="Walkthrough controls" role="group">
        <button class="button button-secondary" type="button" data-scoring-control="back" hidden>Back</button>
        <button class="button button-primary" type="button" data-scoring-control="next">Play</button>
        <button class="button button-secondary" type="button" data-scoring-control="auto">Autoplay</button>
      </div>
      <div class="scoring-slide">
        <div class="scoring-diagram" data-scoring-diagram role="img"></div>
        <div class="scoring-copy">
          <div class="scoring-call" role="group" data-scoring-call hidden></div>
          <h2 data-scoring-heading tabindex="-1">Traditional side-out scoring</h2>
          <p data-scoring-explanation>${examples.doubles.intro}</p>
          <div class="scoring-choices" data-scoring-choices role="group" aria-labelledby="scoring-question" hidden>
            <p id="scoring-question"></p>
            <div class="button-row" data-scoring-options></div>
          </div>
          <p class="scoring-feedback" data-scoring-feedback hidden></p>
        </div>
      </div>
      <p class="scoring-announcement" data-scoring-announcement role="status" aria-atomic="true"></p>
    </div>
  </section>`;
}

function renderDiagram(diagram, slide, highlightServer) {
  const describePlayer = ({ name, team, side }) => `${name} on ${teamNames[team]}’s ${side}`;
  const positions = slide.court.map(describePlayer).join(", ");
  diagram.setAttribute("aria-label", highlightServer ? `${positions}. ${slide.server} serves.` : positions);
  diagram.innerHTML = `
    <div class="scoring-court" aria-hidden="true"><span></span></div>
    <div class="scoring-players" aria-hidden="true">
      ${slide.court.map(({ name, team, side, serving }) => `
        <div class="scoring-player ${highlightServer && serving ? "is-serving" : ""}" data-team="${team}" data-side="${side}">
          <span>${name}</span>${highlightServer && serving ? "<small>Serves</small>" : ""}
        </div>`).join("")}
    </div>
    <span class="scoring-court-team is-top" aria-hidden="true">Violet</span>
    <span class="scoring-court-team is-bottom" aria-hidden="true">Blue</span>`;
}

const autoplayDelay = 4800;

export function mountScoringWalkthrough(root) {
  const find = (name) => root.querySelector(`[data-scoring-${name}]`);
  const formatButtons = [...root.querySelectorAll("[data-scoring-format]")];
  const progress = find("progress");
  const track = progress.querySelector('[role="progressbar"]');
  const count = find("count");
  const diagram = find("diagram");
  const call = find("call");
  const heading = find("heading");
  const explanation = find("explanation");
  const choices = find("choices");
  const question = root.querySelector("#scoring-question");
  const options = find("options");
  const feedback = find("feedback");
  const announcement = find("announcement");
  const back = root.querySelector('[data-scoring-control="back"]');
  const next = root.querySelector('[data-scoring-control="next"]');
  const auto = root.querySelector('[data-scoring-control="auto"]');
  let format = "doubles";
  let slides = buildSlides(format);
  let step = -1;
  let answer = null;
  let timer;

  function stopAutoplay() {
    clearTimeout(timer);
    timer = undefined;
  }

  function update({ focusHeading = false, announce = false } = {}) {
    const finalStep = slides.length - 1;
    const atEnd = step === finalStep;
    const predicting = atEnd && answer === null;
    const started = step >= 0;
    const slide = slides[Math.max(0, predicting ? step - 1 : step)];
    const example = examples[format];
    progress.hidden = !started;
    count.textContent = `Step ${step + 1} of ${slides.length}`;
    track.setAttribute("aria-valuemax", slides.length);
    track.setAttribute("aria-valuenow", Math.max(1, step + 1));
    track.setAttribute("aria-valuetext", count.textContent);
    track.style.setProperty("--scoring-progress", `${Math.max(0, step) / finalStep * 100}%`);
    call.hidden = !started;
    const callLabels = [`${teamNames[slide.serving]} · serving`, `${teamNames[slide.receiving]} · receiving`, "Server #"];
    call.innerHTML = slide.call.map((score, index) => `<div><span>${callLabels[index]}</span><strong>${score}</strong></div>`).join("");
    call.setAttribute("aria-label", `Score call ${slide.call.join("–")}`);
    heading.textContent = predicting ? "Your turn" : started ? slide.title : "Traditional side-out scoring";
    explanation.hidden = predicting;
    explanation.textContent = started ? slide.explanation : example.intro;
    renderDiagram(diagram, slide, started);

    choices.hidden = !predicting;
    if (predicting) {
      question.textContent = example.question;
      options.innerHTML = example.choices.map(([label], index) => `<button type="button" class="button button-secondary" data-scoring-answer="${index}">${label}</button>`).join("");
    }
    feedback.hidden = !atEnd || predicting;
    if (atEnd && !predicting) {
      const [label, name, side] = example.choices[answer];
      feedback.textContent = name === slide.server && side === slide.side ? "Correct." : `You chose ${label}. Review the handoff above.`;
    }

    back.hidden = !started;
    back.disabled = step <= 0;
    next.hidden = predicting;
    next.textContent = atEnd ? "Play again" : started ? (step === finalStep - 1 ? "Predict next serve" : "Next rally") : "Play";
    auto.hidden = atEnd;
    auto.textContent = timer === undefined ? "Autoplay" : "Pause autoplay";

    if (focusHeading) heading.focus();
    if (announce) {
      const message = predicting
        ? question.textContent
        : `${slide.title}. ${slide.server} serves from the ${slide.side}. Score call: ${slide.call.join("–")}.`;
      announcement.textContent = `${count.textContent}. ${message}`;
    }
  }

  function advance() {
    step += 1;
    if (step === slides.length - 1) {
      const active = root.ownerDocument.activeElement;
      stopAutoplay();
      update({ focusHeading: active === next || active === auto, announce: true });
      return;
    }
    update({ announce: true });
  }

  function scheduleAutoplay() {
    timer = setTimeout(() => {
      advance();
      if (step < slides.length - 1) scheduleAutoplay();
    }, autoplayDelay);
  }

  root.addEventListener("click", (event) => {
    const formatButton = event.target.closest("[data-scoring-format]");
    if (formatButton && formatButton.dataset.scoringFormat !== format) {
      stopAutoplay();
      format = formatButton.dataset.scoringFormat;
      slides = buildSlides(format);
      for (const button of formatButtons) button.setAttribute("aria-pressed", String(button === formatButton));
      step = -1;
      answer = null;
      announcement.textContent = "";
      update();
      return;
    }

    const answerButton = event.target.closest("[data-scoring-answer]");
    if (answerButton) {
      answer = Number(answerButton.dataset.scoringAnswer);
      update({ focusHeading: true });
      return;
    }

    switch (event.target.closest("[data-scoring-control]")?.dataset.scoringControl) {
      case "back":
        stopAutoplay();
        step -= 1;
        answer = null;
        update({ announce: true });
        if (back.disabled) next.focus();
        break;
      case "next":
        stopAutoplay();
        if (step === slides.length - 1) step = -1;
        answer = null;
        advance();
        break;
      case "auto":
        if (timer === undefined) {
          step = Math.max(0, step);
          scheduleAutoplay();
        } else stopAutoplay();
        update({ announce: timer !== undefined });
        break;
    }
  });

  update();
  return stopAutoplay;
}
