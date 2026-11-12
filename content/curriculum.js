/*
 * Refined curriculum v2
 *
 * This is deliberately structured data rather than presentation copy.  The
 * renderer decides how a page is shown; this module owns IDs, prerequisites,
 * source labels, and the learning sequence.  Rule wording should be checked
 * against the linked annual rulebook before a new season is published.
 */

const reviewed = "2026-09-01";

export const sourceRegister = [
  { id: "R1", label: "Official rule · USA Pickleball rules hub", title: "USA Pickleball official rules", type: "Official rule", reviewed, url: "https://usapickleball.org/rules/" },
  { id: "R2", label: "Official rule · 2026 rule changes", title: "USA Pickleball 2026 Rulebook Change Document", type: "Official rule", reviewed, url: "https://usapickleball.org/docs/rules/USAP-Rulebook-Change-Document.pdf" },
  { id: "R3", label: "Official rule · Global Pickleball Federation", title: "2026 GPF Rulebook", type: "Official rule", reviewed, url: "https://globalpickleballfederation.org/pickleball-rulebook/" },
  { id: "R4", label: "Governing-body guidance · Skill Level One", title: "USA Pickleball Skill Level One", type: "Governing-body guidance", reviewed, url: "https://usapickleball.org/skill-level/level-one/" },
  { id: "R5", label: "Governing-body guidance · Beginner fundamentals", title: "USA Pickleball beginner fundamentals", type: "Governing-body guidance", reviewed, url: "https://usapickleball.org/pickleball-skills/level-one/pickleball-fundamentals-for-beginners/" },
  { id: "R6", label: "Official rule / positioning guide", title: "USA Pickleball side-out scoring and positioning", type: "Official rule", reviewed, url: "https://usapickleball.org/pickleball-skills/level-one/pickleball-scoring-positioning-side-out-scoring/" },
  { id: "R7", label: "Governing-body guidance · Sportsmanship", title: "USA Pickleball Sportsmanship Guide", type: "Governing-body guidance", reviewed, url: "https://usapickleball.org/sportsmanship-guide/" },
  { id: "R8", label: "Coaching guidance · Return and positioning", title: "USA Pickleball positioning and return guidance", type: "Coaching guidance", reviewed, url: "https://usapickleball.org/pickleball-skills/level-three/return-of-serve-tips/" },
  { id: "R9", label: "Coaching guidance · Third shot", title: "USA Pickleball third-shot drop and drive guidance", type: "Coaching guidance", reviewed, url: "https://usapickleball.org/pickleball-skills/level-three/how-to-hit-a-third-shot-drop-in-pickleball/" },
  { id: "R10", label: "Coaching guidance · Reset shot", title: "USA Pickleball reset-shot guidance", type: "Coaching guidance", reviewed, url: "https://usapickleball.org/pickleball-skills/level-three/what-is-a-pickleball-reset-shot-and-how-to-hit-it/" },
  { id: "R11", label: "Official rule · Wheelchair and adaptive play", title: "USA Pickleball wheelchair and adaptive resources", type: "Official rule", reviewed, url: "https://usapickleball.org/rules/wheelchair/" },
  { id: "R12", label: "Governing-body guidance · Skill Level Three", title: "USA Pickleball Skill Level Three", type: "Governing-body guidance", reviewed, url: "https://usapickleball.org/skill-level/level-three/" },
  { id: "R13", label: "Governing-body guidance · Skill Level Four", title: "USA Pickleball Skill Level Four", type: "Governing-body guidance", reviewed, url: "https://usapickleball.org/skill-level/level-four/" },
  { id: "C1", label: "Coach education · IPTPA", title: "IPTPA certification and teaching pathway", type: "Coach education", reviewed, url: "https://www.iptpa.com/certification.html" },
  { id: "C2", label: "Coach education · PCI", title: "Pickleball Coaching International Level 1", type: "Coach education", reviewed, url: "https://www.pickleballcoachinginternational.com/products/pci-usa-level-1-certification" },
  { id: "P1", label: "Professional coaching perspective · Simone Jardim", title: "Simone Jardim on the third-shot drop", type: "Professional coaching", reviewed, url: "https://joola.com/blogs/blog/the-simone-series-third-shot-drop" },
  { id: "B1", label: "Book · Pickleball Fundamentals, 2nd ed.", title: "Pickleball Fundamentals, 2nd edition", type: "Book reference", reviewed, url: "https://us.humankinetics.com/products/pickleball-fundamentals-2nd-edition" },
  { id: "B2", label: "Book · The Art of Pickleball", title: "The Art of Pickleball", type: "Book reference", reviewed, url: "https://books.google.com/books/about/The_Art_of_Pickleball.html?id=A79TpvqzFvkC" },
  { id: "L1", label: "Learning research · motor learning", title: "Wulf: Motor skill learning and performance", type: "Learning research", reviewed, url: "https://doi.org/10.1111/j.1365-2923.2009.03421.x" },
  { id: "L2", label: "Learning research · retrieval practice", title: "Dunlosky et al.: Effective learning techniques", type: "Learning research", reviewed, url: "https://journals.sagepub.com/doi/10.1177/1529100612453266" },
  { id: "L3", label: "Learning research · test-enhanced learning", title: "Roediger and Karpicke: Test-Enhanced Learning", type: "Learning research", reviewed, url: "https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/" },
  { id: "L4", label: "Learning research · predictable to variable practice", title: "Czyż et al.: contextual interference and transfer", type: "Learning research", reviewed, url: "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1377122/full" },
  { id: "H1", label: "Safety guidance · adult pickleball injuries", title: "Okhovat et al.: lower-extremity injuries in adult players", type: "Safety guidance", reviewed, url: "https://pubmed.ncbi.nlm.nih.gov/42291932/" },
  { id: "H2", label: "Safety guidance · older adult players", title: "Pergolizzi et al.: geriatric pickleball injury", type: "Safety guidance", reviewed, url: "https://pubmed.ncbi.nlm.nih.gov/38174176/" },
];

const art = (name, alt, caption) => ({ src: `assets/illustrations/${name}-v2.png`, alt, caption });
const courtArt = { src: "assets/serve-diagonal.png", alt: "Top-down court view with a diagonal serve path.", caption: "Spatial cues are paired with written directions and labelled controls in Court Lab." };

function page(id, title, body, options = {}) {
  return { id, title, body, type: "orientation", required: true, ...options };
}

function check(id, title, body, prompt, options, correctIndex, sourceIds, optionsExtra = {}) {
  // Compact lesson declarations may omit a separate prompt when the page body
  // is already the scenario. Keep that shorthand normalized at the data edge.
  if (!Array.isArray(sourceIds) && Array.isArray(correctIndex)) {
    optionsExtra = sourceIds || {};
    sourceIds = correctIndex;
    correctIndex = options;
    options = prompt;
    prompt = body;
  }
  return page(id, title, body, {
    type: optionsExtra.type || "retrieval check",
    sourceIds,
    activity: {
      id: `${id}-check`,
      kind: optionsExtra.kind || "retrieval",
      prompt,
      options,
      correctIndex,
      feedback: optionsExtra.feedback || "This answer follows the rule or high-margin coaching cue shown in this lesson.",
      incorrectFeedback: optionsExtra.incorrectFeedback || "Take another look at the situation, then choose the response that follows the key rule or cue.",
    },
    ...optionsExtra,
  });
}

function drill(id, title, body, prompt, sourceIds, options = {}) {
  return page(id, title, body, {
    type: "guided drill",
    sourceIds,
    activity: { kind: "drill", prompt, practicePrompt: options.practicePrompt || "Choose standing, seated, reduced-range, or reading-only practice. Logging it is voluntary and never gates concept completion." },
    ...options,
  });
}

function reflection(id, title, body, prompt, sourceIds) {
  return page(id, title, body, { type: "reflection", sourceIds, activity: { kind: "reflection", prompt } });
}

function optional(id, title, body, sourceIds, options = {}) {
  return page(id, title, body, { required: false, type: "reference", sourceIds, ...options });
}

function lesson(spec) {
  return { core: !spec.optional, kind: "Guided lesson", duration: "6–10 min", adaptations: ["standing", "seated", "reduced movement", "reading-only"], ...spec };
}

const unit1 = {
  id: "unit-1", number: 1, title: "Know the Court", level: "1.0", outcome: "Prepare safely, orient to the court, and explain the kitchen.",
  lessons: [
    lesson({
      id: "court-orientation", title: "Court orientation", duration: "7–9 min", evidence: "Official rule", sourceIds: ["R1", "R3", "R5"], illustration: courtArt,
      outcome: "Identify court landmarks and choose the correct diagonal service destination.", prerequisites: [],
      mastery: "Four of five location decisions correct; each answer receives an explanation.",
      pages: [
        page("why-court", "Why the court matters", "A pickleball court is 20 by 44 feet for both singles and doubles. Start by recognizing the spaces; measurements are a reference, not a memorization test.", { sourceIds: ["R1", "R3"] }),
        page("name-lines", "Name the lines", "The baseline bounds the back, sidelines bound the sides, and the centerline divides service courts. The non-volley-zone line belongs to the kitchen.", { type: "visual explainer", sourceIds: ["R1"], illustration: courtArt }),
        page("service-courts", "Find the service courts", "Right/even and left/odd service courts are useful names. Rotation comes later; for now, trace a serve diagonally across the net and centerline.", { type: "visual explainer", sourceIds: ["R1", "R5"] }),
        page("court-lab", "Explore the full court", "Use the Court Lab for a labelled, keyboard-accessible court. Visit a kitchen, a service court, and a baseline; the coaching text is the complete text alternative.", { type: "interactive simulation", sourceIds: ["R1"], activity: { kind: "court-lab", prompt: "Open Court Lab and explore three labelled zones." } }),
        check("court-recall", "Recall the court map", "Use landmarks instead of color alone. A legal serve travels beyond the kitchen into the diagonally opposite service court.", "From the lower-left baseline, which top court is the service target?", ["Top-left service court", "Top-right service court", "Either kitchen"], 1, ["R1"], { feedback: "Correct. Trace across both the net and centerline to the diagonally opposite court." }),
        optional("court-reference", "Court dimensions and access reference", "Review net height, surrounding space, and a printable text-first court map. Check local court conditions before play.", ["R1", "R3"]),
      ],
    }),
    lesson({
      id: "equipment-safety", title: "Equipment and a safe court setup", duration: "6–8 min", evidence: "Beginner default · Safety guidance", sourceIds: ["B1", "H1", "H2", "R11"], illustration: art("equipment-setup", "A player checks paddle, shoes, ball, and court before play.", "Comfort and a clear court matter more than a specific brand."),
      outcome: "Choose basic equipment, scan the court, and select a gradual preparation routine.", prerequisites: [], mastery: "Identify all immediate hazards in a mixed safe/unsafe court scene.",
      pages: [
        page("what-you-need", "What you need", "Bring a paddle, a setting-appropriate ball, comfortable athletic clothing, water, and court shoes that support lateral movement. Brand, price, and material are not prerequisites.", { sourceIds: ["B1"] }),
        page("fit-and-comfort", "Fit and comfort", "Choose a manageable paddle and secure laces. Eye or sun protection can be useful. These are comfort cues, not universal official requirements.", { sourceIds: ["B1"] }),
        check("court-scan", "Scan before play", "Wet patches, loose balls, bags, damaged surface, poor visibility, and missing space can all change the safest next choice.", "What should happen before a first rally if loose balls are behind the baseline?", ["Play around them", "Move the hazards and make the area clear", "Hit only soft shots"], 1, ["H1", "H2"], { kind: "scenario", feedback: "Correct. Clear hazards first; changing shot speed does not remove the trip risk." }),
        drill("prepare-to-move", "Prepare to move", "Use a short dynamic warm-up and gradually increase intensity. Choose controlled side steps, seated taps, or a reading-only rehearsal.", "Try a 60-second ready-court check, then select your gentle preparation route.", ["H1", "H2", "B1"]),
        optional("lower-impact", "Lower-impact and adaptive route", "Use seated ball control, a smaller movement range, extra recovery time, and personal clinical advice where relevant. No movement is required to learn the rule and safety cues.", ["R11", "H2"]),
      ],
    }),
    lesson({
      id: "ready-position", title: "Grip, ball control, and ready position", duration: "6–8 min", evidence: "Beginner default", sourceIds: ["R5", "L1", "B1"], illustration: art("grips-basics", "A player holds a paddle in a neutral, comfortable ready position.", "A versatile starting grip is guidance, not a rule."),
      outcome: "Use a comfortable neutral grip, a balanced ready position, and controlled taps without excess tension.", prerequisites: ["equipment-safety"], mastery: "Choose the ready position in a visual comparison or complete five controlled taps.",
      pages: [
        page("neutral-grip", "A neutral starting grip", "A continental-style grip is a versatile beginner default. Use the paddle edge and the hand’s V as landmarks; grip choices can evolve.", { type: "visual explainer", sourceIds: ["R5", "B1"] }),
        page("ready-to-react", "Ready to react", "Keep feet comfortably apart, knees unlocked, and the paddle in front of the chest. External cue: show the paddle face to the next ball.", { sourceIds: ["R5", "L1"], illustration: art("stances-ready", "Four adult players show relaxed ready positions.", "A ready position should feel balanced, not rigid.") }),
        check("ready-choice", "Choose the useful reset", "The goal is a controllable paddle near the next ball, not a perfect-looking stance.", "After a tap sends the paddle down by your thigh, what is the most useful reset?", ["Grip harder and swing bigger", "Bring the paddle calmly back in front", "Lock the knees to stay still"], 1, ["R5", "L1"]),
        drill("control-challenge", "Control challenge", "Try ten upward taps, then five alternating forehand/backhand taps. Catches between attempts are allowed; a seated or reading-only path works too.", "Choose one route and notice whether the ball stays near the paddle.", ["R5", "L1"]),
      ],
    }),
    lesson({
      id: "kitchen-rule", title: "The kitchen: what is and is not a fault", duration: "9–11 min", evidence: "Official rule", sourceIds: ["R1", "R2", "R5"], illustration: art("rule-decisions", "Players compare a bounced ball and a volley near the non-volley zone.", "The kitchen is not forbidden; the rule concerns volleys and momentum."),
      outcome: "Decide common non-volley-zone situations, including line contact and volley momentum.", prerequisites: ["court-orientation"], mastery: "Five of six decision scenes correct, including bounce and momentum cases.",
      pages: [
        page("actual-rule", "The actual rule", "The non-volley zone restricts volleying. You may stand in it and play a ball after it bounces. ‘Never enter the kitchen’ is a common but incorrect shortcut.", { sourceIds: ["R1", "R5"] }),
        check("volley-or-bounce", "Volley or bounce?", "First identify whether the ball was hit before it touched the court.", "A player stands in the kitchen and hits a ball after it bounces. Is that allowed?", ["Yes, the ball bounced first", "No, entering the kitchen is always a fault"], 0, ["R1"], { kind: "scenario" }),
        page("feet-and-line", "Feet and the line", "A player volleying while touching the non-volley zone or its line commits a fault. A normal rally ball touching a boundary line is generally in; the serve rule is a special case.", { sourceIds: ["R1", "R2"] }),
        page("momentum", "Momentum belongs to the volley", "If momentum from a volley carries a player into the non-volley zone—even after the ball is dead—the volley is still a fault. Reaching over the zone without touching it is different.", { type: "worked scenario", sourceIds: ["R2"] }),
        check("kitchen-decisions", "Make the kitchen call", "Judge contact, ground contact, and follow-through rather than the player’s intention.", "A player volleys outside the kitchen, then momentum carries their foot onto the kitchen line. What is the call?", ["Play continues", "Fault: the volley momentum carried them onto the line", "Replay the point"], 1, ["R1", "R2"], { kind: "scenario", feedback: "Correct. The act of volleying includes its momentum." }),
        optional("kitchen-reference", "Current kitchen rule reference", "Open the current rule wording and dated change document for edge cases involving connected objects, partners, and momentum.", ["R1", "R2"]),
      ],
    }),
  ],
};

const unit2 = {
  id: "unit-2", number: 2, title: "Start a Rally", level: "1.0–2.0", outcome: "Serve legally, return, and complete the two-bounce opening.",
  lessons: [
    lesson({
      id: "serve-legally", title: "Make a legal serve", duration: "9–11 min", evidence: "Official rule", sourceIds: ["R1", "R2", "R5"], illustration: art("swing-foundations", "A player serves with a relaxed, controlled paddle path.", "Legal serve requirements and coaching cues are kept separate."),
      outcome: "Describe a legal volley or drop serve from the right area to the diagonal service court.", prerequisites: ["court-orientation", "ready-position"], mastery: "Identify legal examples and explain the diagonal target; physical practice is optional.",
      pages: [
        page("serve-purpose", "Start reliably", "For a beginner, the first serve goal is a reliable legal start, not maximum power. Check score, position, target, breath, then serve.", { sourceIds: ["R1", "R5"] }),
        page("serve-area", "Where to stand", "Serve from behind the baseline and within the legal serving-area extensions. The ball travels diagonally and must clear the non-volley zone.", { type: "visual explainer", sourceIds: ["R1", "R2"], illustration: courtArt }),
        page("volley-serve", "Volley serve checklist", "For a volley serve, the paddle has a clear upward arc, the paddle head is clearly not above the wrist joint, and the ball is clearly no higher than the waist at contact.", { sourceIds: ["R2"] }),
        page("drop-serve", "Drop serve option", "A natural release precedes a bounce and contact. Do not apply the volley-serve contact tests as if they were identical; use the official rule for edge cases.", { sourceIds: ["R1", "R2"] }),
        check("legal-serve-check", "Check a serve result", "Rule first: choose a legal motion and diagonal destination. Coaching detail comes after legality.", "Which landing spot is legal for a serve?", ["The diagonally opposite service court, beyond the kitchen", "Any part of the kitchen", "The server’s own service court"], 0, ["R1", "R2"], { kind: "serve-target" }),
        drill("serve-practice", "Relaxed serve practice", "Try five serves to a large central target, then five to the full correct box. Use a no-camera, seated, or reading-only route if that fits today.", "Keep legality and direction ahead of power.", ["R5", "L1"]),
        optional("serve-compare", "Volley and drop serve comparison", "Choose the easier reliable start. Both options require current-rule context; local instructors can help with form.", ["R1", "R2"]),
      ],
    }),
    lesson({
      id: "serve-placement", title: "Serve for reliability and useful depth", duration: "7–9 min", evidence: "Beginner default · Coaching option", sourceIds: ["R5", "L1", "B1"], illustration: art("swing-foundations", "A serve path finishes toward a large target in the opposite court.", "Aim inside the court before aiming near a line."),
      outcome: "Choose a high-margin target and build a repeatable pre-serve routine.", prerequisites: ["serve-legally"], mastery: "Choose legal examples, a useful target, and the correct routine in five of six digital scenarios.",
      pages: [
        page("reliable-target", "Use a high-margin target", "Aim comfortably inside the boundaries before aiming for lines. Depth can make a return harder, but no single target is a rule.", { sourceIds: ["R5"] }),
        page("serve-routine", "A simple routine", "Call the score, check position, choose a target, take a breath, then serve. The score call comes before the serve in the official sequence.", { sourceIds: ["R1"] }),
        check("target-ladder", "Choose the next target", "Build from a large center target to a deep half target, then a chosen side once the reliable start is steady.", "What is the most useful first target for a newer server?", ["A line near the corner", "A large area well inside the correct service court", "The non-volley-zone line"], 1, ["R5", "L1"], { kind: "serve-target", plate: { label: "Serve depth plate", title: "Build a target ladder", items: [{ title: "Legal / in", text: "Use the full correct box." }, { title: "Useful depth", text: "Move toward the back half with margin." }, { title: "Direction", text: "Choose a side only after the first two feel steady." }] } }),
        drill("serve-depth-drill", "Target ladder", "Try three sets of five with a rest and reset between sets. Count legal serves in the target, not ‘perfect technique.’", "Use a standing, seated, reduced-range, or reading-only practice route.", ["R5", "L1"]),
        optional("serve-variation", "Alternate targets", "After basic consistency, alternate two targets. Variable practice is an option after predictable repetitions, not a universal shortcut.", ["L4"]),
      ],
    }),
    lesson({
      id: "two-bounce-opening", title: "Return serve and honor the two-bounce opening", duration: "8–10 min", evidence: "Official rule · Beginner positioning guidance", sourceIds: ["R1", "R5", "R8"], illustration: art("footwork-foundations", "A player returns a serve and pauses before moving forward.", "The return must bounce; then the serving team’s next ball must bounce."),
      outcome: "Return after the serve bounces, move toward a useful position, and let the serving team’s next ball bounce.", prerequisites: ["serve-legally"], mastery: "Correctly reconstruct the opening and choose safe movement after the return.",
      pages: [
        page("return-must-bounce", "The first bounce", "The receiving team returns the serve only after it bounces. This starts the two-bounce sequence.", { sourceIds: ["R1"] }),
        page("serving-team-bounce", "The second bounce", "The serving team lets the return bounce before hitting it. Only after those two bounces may either team volley.", { sourceIds: ["R1", "R5"] }),
        page("return-position", "Return, then move with control", "A controlled, deeper return can give the receiver time to move forward. Do not sprint through an unsafe or unbalanced next ball.", { type: "worked scenario", sourceIds: ["R8"] }),
        check("opening-recall", "Rebuild the opening", "Keep the sequence separate from a general ‘no volley’ rule: it only governs the opening rally.", "After the receiver returns a serve, what must happen before the serving team hits?", ["The return must bounce", "The serving team must volley", "Both teams enter the kitchen"], 0, ["R1"], { kind: "sequence" }),
        drill("return-practice", "Return and pause drill", "Use a cooperative feed or shadow sequence: let the serve bounce, return with margin, then pause in balance before moving. A reading-only replay completes the page.", "Choose the route that fits your space and movement today.", ["R8", "L1"]),
        optional("opening-reference", "Two-bounce rule reference", "Open the current official wording before a league or tournament if a local convention sounds different.", ["R1", "R2"]),
      ],
    }),
    lesson({
      id: "opening-rally", title: "Opening-rally simulation", duration: "8–10 min", evidence: "Official rule · Beginner default", sourceIds: ["R1", "R5", "L2", "L3"], illustration: courtArt,
      outcome: "Choose a legal serve, return, and third contact while preserving the two-bounce opening.", prerequisites: ["two-bounce-opening"], mastery: "Complete the staged opening sequence with explanation after each choice.",
      pages: [
        page("worked-opening", "Watch one complete opening", "Start behind the baseline, serve diagonally, let the return bounce, then let the serving team’s next ball bounce. Now the rally is open to volleys where legal.", { type: "worked scenario", sourceIds: ["R1"] }),
        check("serve-state", "State 1: serve", "The serve begins the point from behind the baseline into the diagonal service court.", "Which is the reliable first choice?", ["Serve diagonally beyond the kitchen", "Volley from inside the kitchen", "Serve straight down the sideline"], 0, ["R1"], { kind: "simulation" }),
        check("return-state", "State 2: return", "The receiver lets the serve bounce before returning it.", "Can the receiver volley the serve?", ["Yes, if standing outside the kitchen", "No, the serve must bounce first"], 1, ["R1"], { kind: "simulation" }),
        check("third-state", "State 3: serving-team reply", "The return must bounce for the serving team before its next hit. This is the second bounce in the opening.", "What is required before the serving team hits the return?", ["Let the return bounce", "Hit it in the air to finish the rule", "Move both partners to the kitchen first"], 0, ["R1"], { kind: "simulation" }),
        reflection("opening-reflect", "A first-rally cue", "Pick one cue for your next game: ‘bounce, bounce, then rally’ or ‘pause and see the next ball.’ You can revisit the simulation anytime.", "Save the cue you want to use next time.", ["L2", "L3"]),
      ],
    }),
  ],
};

const unit3 = {
  id: "unit-3", number: 3, title: "Keep Score", level: "1.0–2.0", outcome: "Call a doubles score and restore correct positions.",
  lessons: [
    lesson({
      id: "doubles-scoring", title: "Call a doubles score", duration: "8–10 min", evidence: "Official rule", sourceIds: ["R1", "R6"], illustration: art("rule-decisions", "Two doubles players call a score before a serve.", "A doubles score tells both the point state and the server."),
      outcome: "Call the three-number doubles score in the correct order before serving.", prerequisites: ["serve-legally"], mastery: "Call score examples accurately and explain what each number means.",
      pages: [
        page("three-numbers", "Three numbers, one purpose", "Traditional doubles uses server score, receiver score, then server number. Say the score before the serve and ask for a repeat when needed.", { sourceIds: ["R1", "R6"] }),
        page("server-number", "Why the server number matters", "At the start of a game, the opening team’s first server is designated to avoid an unfair two-server advantage. Track it as part of the score call.", { sourceIds: ["R1", "R6"] }),
        check("score-call", "Call this score", "Server’s team has 4, receiving team has 2, and the current player is second server.", "Which call matches the state?", ["2–4–2", "4–2–2", "4–2–1"], 1, ["R1", "R6"], { kind: "score-simulation" }),
        check("score-before-serve", "Choose the sequence", "A clear score call gives both teams a chance to notice an error before the next serve.", "What comes immediately before serving?", ["Call the score", "Switch sides", "Start a volley"], 0, ["R1"]),
      ],
    }),
    lesson({
      id: "rotation-positions", title: "Player positions and rotation", duration: "9–11 min", evidence: "Official rule · Positioning guide", sourceIds: ["R1", "R6"], illustration: art("partner-positioning", "Doubles partners stand in service positions on a court.", "Score and service status anchor positioning."),
      outcome: "Restore legal doubles positions from the score and serving team.", prerequisites: ["doubles-scoring"], mastery: "Restore positions in four worked score states.",
      pages: [
        page("even-odd-anchor", "Use an even/odd anchor", "At the start of a rally, score parity helps identify the correct side for the server or receiver. Use the official rule as the source of truth when restoring a disputed position.", { sourceIds: ["R1", "R6"] }),
        page("win-serve-continue", "When the serving team wins", "The serving team scores and the server changes sides with their partner before the next serve. The receiving team stays put.", { type: "worked scenario", sourceIds: ["R6"] }),
        page("lose-rally", "When the serving team loses", "The serve passes according to server number and side-out sequence. Keep the score call visible before deciding positions.", { type: "worked scenario", sourceIds: ["R1", "R6"] }),
        check("restore-position", "Restore the court", "Start with who is serving, then score parity, then server number. Do not guess from where a player happened to stand during the last rally.", "A serving team wins the rally. What changes before the next serve?", ["Only the receiver changes sides", "The serving team scores and switches sides", "Everyone stays in exactly the same place"], 1, ["R1", "R6"], { kind: "score-simulation" }),
        optional("position-reference", "Position restoration reference", "Use this searchable reference when a game pauses for a score question. It is a guide, not a substitute for an official referee ruling.", ["R1", "R6"]),
      ],
    }),
    lesson({
      id: "side-outs-formats", title: "Side-outs, score questions, and scoring variants", duration: "7–9 min", evidence: "Official rule · Local convention", sourceIds: ["R1", "R2", "R6"], illustration: art("rule-decisions", "Players pause to confirm a score before resuming play.", "Ask and resolve a score question before the next serve when possible."),
      outcome: "Explain a side-out, handle a score question calmly, and recognise that scoring formats may vary.", prerequisites: ["rotation-positions"], mastery: "Identify a side-out and select the correct rule reference for a format question.",
      pages: [
        page("side-out", "What a side-out means", "When the receiving team gains the right to serve under traditional doubles scoring, that change is a side-out. The new serving team does not automatically score for winning the prior rally.", { sourceIds: ["R1", "R6"] }),
        page("score-question", "Pause, ask, restore", "If the score is uncertain, state what each team remembers, use the official restoration method, and agree before the next serve. Calm communication prevents a small error from growing.", { sourceIds: ["R1", "R6"] }),
        check("format-choice", "Find the right reference", "Rally scoring and local formats can differ from traditional recreational doubles. Label a club convention rather than presenting it as universal.", "A tournament announces a provisional rally-scoring format. What is the useful next step?", ["Assume traditional side-out rules apply", "Open the event’s current format/rule reference", "Ignore the score call"], 1, ["R1", "R2"], { kind: "scenario" }),
        optional("scoring-variants", "Format comparison", "Compare traditional doubles, singles, and provisional options with review dates. Local club practice can vary; confirm it before play.", ["R1", "R2", "R6"]),
      ],
    }),
  ],
};

const unit4 = {
  id: "unit-4", number: 4, title: "Play the Point", level: "2.0–2.5", outcome: "Use basic strokes and move from baseline to kitchen with control.",
  lessons: [
    lesson({
      id: "groundstrokes", title: "Forehand and backhand groundstrokes", evidence: "Beginner default", sourceIds: ["R5", "B1", "L1"], illustration: art("swing-foundations", "A player hits compact forehand and backhand groundstrokes.", "Use an external target cue before adding body-part detail."),
      outcome: "Send a bounced ball with a compact forehand or backhand toward a generous target.", prerequisites: ["ready-position"], mastery: "Choose a controllable preparation and target; optional practice never gates completion.",
      pages: [
        page("groundstroke-purpose", "Make contact manageable", "Start with a ball that has bounced. Turn enough to meet it in front, use a compact path, and send it with margin toward a large target.", { sourceIds: ["R5", "B1"] }),
        page("forehand-backhand", "Two sides, one calm cue", "Forehand and backhand use different sides of the body, but both benefit from early preparation and a finish toward the target. Avoid a large backswing before contact feels controllable.", { sourceIds: ["R5", "L1"] }),
        check("groundstroke-choice", "Choose the high-margin response", "A low, fast ball is usually a reason to simplify contact and target—not to add a bigger swing.", "What is the useful next choice on a low bounced ball?", ["A compact swing toward a larger target", "A maximum-power swing at the line", "Wait until it passes"], 0, ["R5", "L1"], { kind: "decision" }),
        drill("groundstroke-drill", "Predictable then variable", "Begin with five predictable feeds to one target, then alternate targets after you understand the cue. Choose shadow swings, seated taps, or a reading-only replay if needed.", "Track playable contacts, not a body-shape score.", ["L1", "L4", "B1"]),
      ],
    }),
    lesson({
      id: "volleys", title: "Volleys and compact reactions", evidence: "Beginner default", sourceIds: ["R5", "B1", "L1"], illustration: art("power-finishing", "A player blocks a volley with a compact paddle in front.", "A volley is a small redirection, not a groundstroke taken in the air."),
      outcome: "Recognize a volley and use a compact, balanced redirection away from the non-volley-zone fault.", prerequisites: ["groundstrokes", "kitchen-rule"], mastery: "Choose a legal, compact response in the visual scenarios.",
      pages: [
        page("volley-definition", "What makes a volley", "A volley is hit before the ball bounces. It can be useful near the kitchen line, but the kitchen rule still applies to contact and momentum.", { sourceIds: ["R1", "R5"] }),
        page("compact-reaction", "Keep the paddle in front", "Use a quiet ready position, short preparation, and a target with margin. The aim is to redirect a playable ball rather than add force.", { sourceIds: ["R5", "L1"] }),
        check("volley-choice", "Read the ball and feet", "Check whether you are touching the kitchen or its line before choosing the volley.", "You are balanced outside the kitchen and the ball arrives above the net before bouncing. What is a useful option?", ["A compact volley toward open court", "Step onto the kitchen line while volleying", "Wait for a second serve"], 0, ["R1", "R5"], { kind: "scenario" }),
        drill("volley-drill", "Soft block practice", "Use gentle partner feeds, a wall at safe distance, shadow motions, or a reading-only route. Keep targets away from people and stop if control fades.", "Try five compact redirections, then rest and reflect.", ["H1", "L1", "B1"]),
      ],
    }),
    lesson({
      id: "dinks", title: "Dinks: control before attack", evidence: "Beginner default · Coaching guidance", sourceIds: ["R5", "B1", "R12"], illustration: art("soft-game", "Two players exchange soft dinks near the kitchen line.", "A neutral dink buys time and keeps the ball less attackable."),
      outcome: "Use a soft, high-margin dink and recognise why patience can be the useful choice.", prerequisites: ["volleys"], mastery: "Choose a neutral dink when the ball is low or balance is poor.",
      pages: [
        page("dink-purpose", "A dink creates a slower decision", "A dink is a soft shot near the kitchen that aims to keep the ball low and controlled. It is not a compulsory style; it is one way to reduce attackable height.", { sourceIds: ["R5", "B1"] }),
        page("control-cue", "Send it high enough to land softly", "Use a compact paddle path and a comfortable margin over the net. Watch the landing and the opponent’s next option instead of chasing a precise body position.", { sourceIds: ["L1", "R5"] }),
        check("dink-or-attack", "Wait for the better ball", "A low ball while off balance often calls for a neutral response, not an immediate speed-up.", "The ball is low and you are leaning. What is the high-margin choice?", ["Soft dink or neutral reset", "Hard attack at the sideline", "Volley from the kitchen line"], 0, ["R5", "R12"], { kind: "decision" }),
        drill("dink-drill", "Cooperative dink set", "Try ten cooperative dinks to a generous kitchen target, alternate with a partner, or run a seated/reading-only visualization. Stop before fatigue changes control.", "Count controlled landings, not winners.", ["B1", "L1"]),
      ],
    }),
    lesson({
      id: "transition-movement", title: "Transition movement and balanced stops", duration: "8–10 min", evidence: "Beginner default · Safety guidance", sourceIds: ["R8", "H1", "L1"], illustration: art("footwork-foundations", "Partners move forward in short balanced steps with paddles ready.", "Transition is a sequence of balanced choices, not a sprint."),
      outcome: "Move from baseline toward the kitchen in controlled steps and pause when the next ball needs a stable response.", prerequisites: ["opening-rally"], mastery: "Choose advance, hold, or retreat from a worked transition situation.",
      pages: [
        page("transition-not-sprint", "Move in decisions, not a rush", "After the two-bounce opening, advance when your shot gives you time. Stop in balance when opponents can attack; avoid blind backpedaling.", { sourceIds: ["R8", "H1"] }),
        page("partner-together", "Arrive together", "In doubles, notice partner spacing. A team that moves together leaves fewer accidental gaps and has more time to communicate.", { sourceIds: ["R8"] }),
        check("advance-hold", "Choose the next move", "Your return is short and the opponent can strike it above net height. A balanced stop is often safer than racing forward.", "What is the useful decision?", ["Advance at full speed", "Hold in balance and prepare to defend", "Turn away from the ball"], 1, ["R8", "H1"], { kind: "decision" }),
        drill("transition-drill", "Two-stop movement", "Use two small, balanced stops before the kitchen line, a reduced-range walk-through, seated court mapping, or reading-only rehearsal.", "Choose control and clear sightlines over speed.", ["H1", "L1"]),
      ],
    }),
    lesson({
      id: "drop-reset", title: "Third-shot drop and defensive reset", duration: "9–11 min", evidence: "Coaching option", sourceIds: ["R9", "R10", "P1", "L1"], illustration: art("soft-game", "A player sends a soft third shot toward the kitchen.", "A drop or reset aims to make the next ball more manageable, not necessarily win the rally."),
      outcome: "Use the ideas of a soft third-shot drop and a reset to buy time and reduce pressure.", prerequisites: ["groundstrokes", "transition-movement"], mastery: "Choose a high-margin soft response when a hard attack would expose balance.",
      pages: [
        page("third-shot-intent", "Give yourself time", "A third-shot drop is a soft ball that can land near the kitchen and help a team move forward. The goal is a playable next ball, not a perfect winner.", { sourceIds: ["R9", "P1"] }),
        page("reset-intent", "Reset pressure", "A reset absorbs pace or a difficult position and returns the ball to a more neutral trajectory. It is distinct from a return serve and belongs after dink/volley/transition context.", { sourceIds: ["R10"] }),
        check("soft-choice", "Choose a safer continuation", "When the ball is low, deep, or you are off balance, a soft continuation can protect the next decision.", "You are stretched on a low third ball. What is a useful default?", ["High-margin soft continuation or reset", "Hard drive at a narrow line", "Rush into the kitchen before contact"], 0, ["R9", "R10"], { kind: "decision" }),
        drill("drop-reset-drill", "Soft target practice", "Use a large kitchen-area target, shadow an easy-to-hard sequence, or select a reading-only route. Judge whether the next ball would be playable.", "Try one cue: ‘lift with margin, then recover.’", ["R9", "P1", "L1"]),
        optional("drop-reset-compare", "Drop, reset, and drive reference", "These shots solve different problems. Keep the reference open while you learn, and avoid treating one professional style as the only right method.", ["R9", "R10", "P1"]),
      ],
    }),
  ],
};

const unit5 = {
  id: "unit-5", number: 5, title: "Play Well With Others", level: "1.0–2.5", outcome: "Communicate, make fair calls, and complete a first game.",
  lessons: [
    lesson({
      id: "partner-communication", title: "Doubles positioning and communication", evidence: "Beginner default · Sportsmanship", sourceIds: ["R7", "R8", "B1"], illustration: art("partner-positioning", "Doubles partners use clear spacing and a hand signal.", "Simple, agreed communication prevents confusion without needing a complex system."),
      outcome: "Use simple partner spacing, call the ball, and recover together after a rally changes shape.", prerequisites: ["rotation-positions", "transition-movement"], mastery: "Choose a clear call and a coverage response in a doubles scenario.",
      pages: [
        page("shared-space", "Share the court", "Start with a simple expectation: call ‘mine,’ ‘yours,’ ‘switch,’ or ‘out’ early enough for a partner to respond. Agreement matters more than fancy terminology.", { sourceIds: ["R7", "B1"] }),
        page("move-together", "Move together", "When a team advances or holds together, it reduces an open middle and surprises. Keep a safe amount of space and watch the ball, not only a preset formation.", { sourceIds: ["R8"] }),
        check("partner-call", "Choose the clear message", "A ball heads between partners. A short, early call is more useful than silent assumptions.", "What is the best first communication?", ["Call ‘mine’ or ‘yours’ early", "Both swing without speaking", "Wait until the ball lands"], 0, ["R7"], { kind: "scenario" }),
        drill("partner-drill", "Simple call-and-recover", "With a partner, use gentle feeds and one agreed call. Solo learners can rehearse the sequence with a court map or choose reading-only completion.", "Keep bodies and paddles in safe shared space.", ["R7", "H1"]),
      ],
    }),
    lesson({
      id: "fair-calls", title: "Faults, line calls, and sportsmanship", evidence: "Official rule · Sportsmanship", sourceIds: ["R1", "R7"], illustration: art("etiquette-communication", "Players respectfully discuss a close line call.", "Fair, prompt communication supports a welcoming game."),
      outcome: "Recognise common faults, make fair line calls, and ask for a calm reset when a question arises.", prerequisites: ["kitchen-rule"], mastery: "Choose the fair action in fault and line-call scenarios.",
      pages: [
        page("fault-language", "Use fault precisely", "Reserve ‘fault’ for a rule violation. For a technique choice, say less reliable, higher risk, or try this instead. That keeps feedback factual and kind.", { sourceIds: ["R1", "R7"] }),
        page("line-calls", "Make the line call fairly", "Call your side’s ball out promptly and clearly when you see space between the ball and line. If you are unsure, treat the ball as in under the official standard.", { sourceIds: ["R1", "R7"] }),
        check("fair-call-choice", "Make the sporting call", "You are unsure whether your opponent’s ball touched the sideline.", "What is the fair call?", ["Call it out because it looked close", "Treat it as in when you are unsure", "Replay every close ball automatically"], 1, ["R1", "R7"], { kind: "scenario" }),
        reflection("sportsmanship-reflect", "Choose a useful phrase", "Pick a short phrase for your next game: ‘Can we confirm the score?’, ‘I had that in,’ or ‘Let’s reset positions together.’", "Save one phrase that makes the next game easier.", ["R7"]),
      ],
    }),
    lesson({
      id: "open-play", title: "Open play, local conventions, and inclusive participation", duration: "7–9 min", evidence: "Local convention · Official adaptive rules", sourceIds: ["R2", "R7", "R11"], illustration: art("adaptive-play", "Players with varied movement styles participate in an inclusive pickleball session.", "Local routines can vary; official adaptive rules have direct references."),
      outcome: "Enter open play with a clear checklist, distinguish club conventions from rules, and find adaptive references.", prerequisites: ["fair-calls"], mastery: "Build a five-item first-session checklist and label rule versus local convention.",
      pages: [
        page("open-play-basics", "Arrive ready to join", "Ask how the queue works, whether paddles are stacked, the intended game format, and any local safety practice. These are often conventions, not universal rules.", { sourceIds: ["R7"] }),
        page("inclusive-rules", "Inclusive rules exist", "Wheelchair, adaptive standing, and hybrid play have dedicated current provisions. Do not compress them into a generic statement; open the official source for the format in use.", { sourceIds: ["R2", "R11"] }),
        check("rule-or-convention", "Label the statement", "A club says ‘winners stay on Court 2.’ What kind of guidance is that?", ["An official universal rule", "A local convention to confirm at that club", "A serve requirement"], 1, ["R7", "R11"], { kind: "scenario" }),
        reflection("first-session-plan", "Your first-session checklist", "Write or mentally rehearse: water, court scan, ask queue format, agree score format, and choose one kind communication cue.", "Save the five-item readiness plan.", ["R7", "H1"]),
        optional("adaptive-reference", "Adaptive and wheelchair quick reference", "Open direct official adaptive resources, then ask local organisers what format and access supports are in place.", ["R2", "R11"]),
      ],
    }),
    lesson({
      id: "first-game-rehearsal", title: "First-game rehearsal and readiness check", duration: "10–12 min", evidence: "Integrated assessment · Not an official rating", sourceIds: ["R4", "R6", "R7", "L2", "L3"], illustration: art("etiquette-communication", "Four players begin a friendly doubles game with a clear score call.", "A rehearsal helps you choose what to review; it does not award a rating."),
      outcome: "Complete a simulated or on-court short game while serving legally, tracking score, making fair calls, and communicating.", prerequisites: ["opening-rally", "doubles-scoring", "rotation-positions", "fair-calls"], mastery: "Complete the rehearsal with each safety- and rule-critical behavior represented at least once.",
      pages: [
        page("prepare-game", "Prepare", "Check court and equipment, agree roles and scoring format, choose a starting server, and pick one personal success goal. A readiness goal can be as small as calling the score clearly.", { sourceIds: ["R4", "R7"] }),
        check("rehearsal-serve", "Game moment: start the point", "Use the score call, position, legal serve, and diagonal target before adding tactical goals.", "What is the first priority at the start of your rehearsal point?", ["A legal, clearly called serve", "A winner on the first ball", "Moving into the kitchen before serving"], 0, ["R1", "R6"], { kind: "simulation" }),
        check("rehearsal-rally", "Game moment: keep it fair", "A close ball lands near the sideline and you are not sure what you saw.", "What keeps the rehearsal useful and fair?", ["Call it out to protect the score", "Treat it as in and continue or calmly confirm", "Ignore your partner’s question"], 1, ["R7"], { kind: "simulation" }),
        reflection("rehearsal-reflect", "Reflect and choose next", "Record what felt clear, what broke down, and one lesson to revisit. Mechanics gaps suggest Unit 4 review; reliable game play with weak placement can lead to Unit 6.", "Save one next focus rather than a long list of fixes.", ["L2", "L3", "R4"]),
      ],
    }),
  ],
};

const unit6 = {
  id: "unit-6", number: 6, title: "Build a Reliable Game", level: "3.0–3.5 guidance", optional: true, outcome: "Add placement, third-shot decisions, and pressure recovery.",
  lessons: [
    lesson({
      id: "serve-return-purpose", title: "Serve and return with depth and purpose", optional: true, evidence: "Coaching guidance", sourceIds: ["R8", "R12", "L4"], illustration: art("swing-foundations", "A player chooses a deep serve target and recovers for the next ball.", "Reliability, depth, and direction are a priority ladder—not a rating."),
      outcome: "Choose serve/return targets that improve the next-ball situation without sacrificing reliability.", prerequisites: ["serve-placement", "groundstrokes"], mastery: "Describe an improving trend across two sessions rather than chase a fixed percentage.",
      pages: [
        page("priority-ladder", "Three priorities", "Use a simple ladder: legal/in, then useful depth, then intentional direction. For returns, leave enough baseline space and recover after controlled contact.", { sourceIds: ["R8", "R12"] }),
        page("target-options", "Targets are options", "Middle, backhand-side, and wide targets create different next-ball pictures. They are tactical options, not universal instructions.", { type: "visual explainer", sourceIds: ["R8"] }),
        check("depth-decision", "Keep the first priority", "Your usual deep target is causing repeated faults today.", "What is the useful adjustment?", ["Return to a larger legal target, then rebuild depth", "Aim closer to the line", "Skip the score call"], 0, ["R8", "L4"], { kind: "decision" }),
        drill("depth-trend", "Depth trend drill", "Use 20 serves and 20 returns: track in, deep target, and next-ball readiness. Start predictable, then mix targets after a stable set.", "Use left-handed, reduced-movement, or reading-only variants as needed.", ["R8", "L4"]),
        reflection("depth-reflect", "Read the trend", "Compare two sessions and choose one constraint: legality, depth, or recovery. Do not turn the log into an official rating.", "Save the smallest useful adjustment.", ["R12", "L2"]),
      ],
    }),
    lesson({
      id: "third-shot-choice", title: "Third-shot choice: drop, drive, or safer continuation", optional: true, duration: "10–12 min", evidence: "Coaching option", sourceIds: ["R9", "P1", "L1"], illustration: art("soft-game", "A court-side decision map compares a drop, drive, and neutral continuation.", "Use ‘often’ and ‘consider’ rather than a rigid shot rule."),
      outcome: "Select a third-shot response based on ball height, depth, balance, and opponent position.", prerequisites: ["drop-reset"], mastery: "Choose a response and recovery in six varied decision scenes.",
      pages: [
        page("worked-compare", "Compare the intentions", "A low/deep return often favors a controlled drop. A shorter/higher ball can invite a drive. Off balance can call for a high-margin continuation. A drive may set up a later drop.", { type: "worked scenario", sourceIds: ["R9", "P1"], plate: { label: "Third-shot choice plate", title: "Read the ball, then recover", items: [{ title: "Low / deep", text: "Often consider a controlled drop." }, { title: "Short / higher", text: "A drive can be an option." }, { title: "Off balance", text: "Choose a safer continuation first." }] } }),
        check("low-deep", "Low and deep", "You are stretched behind the baseline on a low return.", "Which choice is often most useful?", ["Controlled drop or safer continuation", "Maximum-speed drive at the line", "Sprint forward before contact"], 0, ["R9"], { kind: "decision" }),
        check("short-high", "Short and higher", "The ball sits shorter and higher, and you are balanced.", "What can be a reasonable option?", ["Consider a controlled drive and recover", "Always drop no matter the ball", "Hit before the ball arrives"], 0, ["R9", "P1"], { kind: "decision" }),
        check("recovery-read", "Judge the result", "After any third shot, use advance, hold, or defend as the next read rather than measuring only winners.", "A drive stays in but the opponents are ready to counter. What is the next job?", ["Recover for the next ball", "Celebrate and stop moving", "Assume the point is over"], 0, ["R9"], { kind: "decision" }),
        drill("drop-drive-sets", "Predictable, then mixed", "Try one drop set and one drive set before ten mixed decisions. Video or text decisions are a complete alternative to hitting.", "Rate each shot by the next ball it creates.", ["R9", "P1", "L4"]),
      ],
    }),
    lesson({
      id: "dink-placement", title: "Dink placement and attackable-ball recognition", optional: true, evidence: "Coaching guidance", sourceIds: ["R12", "R13", "B1"], illustration: art("soft-game", "A player compares crosscourt, middle, and straight dink targets.", "Attackability depends on height, balance, reach, and opponent position."),
      outcome: "Control dink trajectory, move an opponent with direction, and distinguish attackable from neutral balls.", prerequisites: ["dinks"], mastery: "Five of six attack/wait decisions correct plus optional controlled practice.",
      pages: [
        page("neutral-trajectory", "Start with neutral", "A low, controlled trajectory gives you time. Straight, crosscourt, and middle targets can move the pattern, but none is automatically correct.", { sourceIds: ["R12", "R13"] }),
        page("attackability", "Read the relationship", "Attackability is not a colored spot. Consider contact height, your balance and reach, the opponent’s position, and the ball’s likely rebound.", { type: "visual explainer", sourceIds: ["R13"] }),
        check("wait-decision", "A ball that asks for patience", "The ball is low below net height and you are reaching wide.", "What is the useful response?", ["Neutral dink or reset", "Speed up toward the line", "Step into the kitchen while volleying"], 0, ["R12", "R13"], { kind: "decision" }),
        check("attack-decision", "A more attackable ball", "The ball rises above net height, you are balanced, and the opponent is leaning away from open space.", "What is a reasonable option?", ["A controlled acceleration toward safe space", "A blind maximum-power swing", "Ignore partner position"], 0, ["R13"], { kind: "decision" }),
        drill("dink-placement-drill", "Three drill modes", "Choose cooperative crosscourt dinks, two-target alternation, or an agreed ‘attack only on this ball’ game. Visual decisions are a full alternative.", "Keep targets away from bodies and evaluate the next ball.", ["B1", "R13"]),
      ],
    }),
    lesson({
      id: "pace-reset-response", title: "Speed-ups, counters, blocks, and resets", optional: true, duration: "10–12 min", evidence: "Intermediate coaching guidance", sourceIds: ["R10", "R13", "H1"], illustration: art("power-finishing", "Players compare a controlled speed-up, compact counter, block, and reset.", "Control and safe target choices take priority over pace."),
      outcome: "Initiate pace selectively and respond with a compact counter, block, or reset.", prerequisites: ["volleys", "drop-reset", "dink-placement"], mastery: "Choose the correct response in seven of eight scenarios; physical speed is never required.",
      pages: [
        page("four-intentions", "Four intentions", "A speed-up pressures, a counter redirects, a block absorbs, and a reset neutralizes. Name the intention before choosing the stroke.", { sourceIds: ["R10", "R13"], plate: { label: "Pace and reset plate", title: "Choose an intention before pace", items: [{ title: "Pressure", text: "Speed-up only from a useful ball." }, { title: "Redirect", text: "Counter or block with compact contact." }, { title: "Neutralize", text: "Reset when pressure or balance asks for time." }] } }),
        page("safe-pace", "Control first", "Attacking from poor balance or low contact can expose the attacker. Use compact preparation and targets away from a partner’s head or body.", { sourceIds: ["H1", "R13"] }),
        check("pace-read", "Choose the response", "A hard ball arrives at your torso while you are balanced but have little backswing time.", "What is a useful response?", ["Compact block or counter toward safe space", "Large wind-up at a narrow line", "Turn away from the ball"], 0, ["R10", "R13"], { kind: "decision" }),
        check("reset-read", "Take the pressure out", "A low fast ball finds you stretched and late.", "What is the high-margin option?", ["Absorb and reset to a neutral ball", "Force a winner from the stretch", "Race through the kitchen"], 0, ["R10"], { kind: "decision" }),
        drill("pace-response-drill", "Safe response progression", "Start with predictable gentle feeds and explicit safe zones, then add ‘soft or fast’ choices. Complete as video decisions if you do not want to hit fast balls.", "Stop or simplify if control fades.", ["H1", "R10"]),
      ],
    }),
    lesson({
      id: "transition-pressure", title: "Transition under pressure", optional: true, evidence: "Intermediate coaching guidance", sourceIds: ["R10", "R12", "H1"], illustration: art("footwork-foundations", "Partners pause and reset during a transition rally.", "Repeated balanced decisions are safer than a run to the line."),
      outcome: "Move through transition as a team using drops, blocks, and resets while choosing when to stop or retreat.", prerequisites: ["transition-movement", "drop-reset", "pace-reset-response"], mastery: "Choose advance, hold, reset, or retreat in a staged court scenario.",
      pages: [
        page("phase-one", "Phase 1: playable drop", "A workable soft ball can create time. Advance only when its quality and the opponent’s options allow it.", { sourceIds: ["R10"] }),
        page("phase-two", "Phase 2: partial advance", "Take small balanced steps with your partner. If an opponent attacks, a stable stop makes a block or reset more available.", { sourceIds: ["R12", "H1"] }),
        check("pressure-sequence", "Phase 3: reset and decide", "The opponent attacks while one partner is still in transition.", "What is the most useful team read?", ["Reset, hold in balance, then advance together when possible", "Both sprint to the line regardless", "Backpedal without watching the ball"], 0, ["R10", "H1"], { kind: "simulation" }),
        drill("transition-pressure-drill", "Two stops before the line", "Try a cooperative two-stop drill before unpredictable feeds. Choose a reduced-range walk-through, court map, or reading-only route when needed.", "Reward balance and team spacing rather than speed.", ["H1", "R12"]),
      ],
    }),
  ],
};

const unit7 = {
  id: "unit-7", number: 7, title: "Deep-Dive Play", level: "3.5–4.5 guidance", optional: true, outcome: "Use partner systems, specialty-shot reference, formats, and self-analysis.",
  lessons: [
    lesson({
      id: "partner-systems", title: "Partner systems: switching, stacking, and poaching", optional: true, duration: "10–12 min", evidence: "Advanced coaching option", sourceIds: ["R1", "R13"], illustration: art("partner-positioning", "A court map shows partners switching, stacking, and recovering coverage.", "Systems are options; legal serve/receive positions still matter."),
      outcome: "Explain switching, stacking, and poaching while restoring legal positions and coverage.", prerequisites: ["rotation-positions", "partner-communication", "transition-pressure"], mastery: "Six of seven legal-position and coverage decisions plus a written partner signal plan.",
      pages: [
        page("ordinary-first", "Start from ordinary positions", "Begin with standard positions and clear coverage. A system should solve a specific team preference, not replace basic communication.", { sourceIds: ["R13"] }),
        page("switch-stack-poach", "Add one tactic at a time", "Switching changes side coverage after a shot. Stacking begins both players on one side before moving to preferred positions. Poaching crosses into expected coverage to attack a suitable ball.", { type: "visual explainer", sourceIds: ["R13", "R1"], plate: { label: "Partner systems plate", title: "Change one coverage decision at a time", items: [{ title: "Switch", text: "Trade side coverage after the shot." }, { title: "Stack", text: "Start legal, then move into a preferred pattern." }, { title: "Poach", text: "Attack suitable middle ball, then cover the space opened." }] } }),
        check("stacking-legality", "Restore legal positions", "A team wants a preferred forehand in the middle but the score call still determines legal server and receiver positions.", "What remains non-negotiable?", ["Correct legal serving/receiving position", "Who takes every ball", "A fixed stack after the rally begins"], 0, ["R1", "R13"], { kind: "scenario" }),
        check("poach-recovery", "Read the open space", "A player poaches a ball from the middle.", "What must happen next?", ["Cover the space the poach opened and communicate", "Assume the point is over", "Both partners cover the same sideline"], 0, ["R13"], { kind: "decision" }),
        reflection("partner-plan", "Make a simple partner plan", "Choose one signal, one middle-ball expectation, and one recovery phrase. Print or remember it; keep it adaptable.", "Save a one-sentence partner plan.", ["R13", "R7"]),
      ],
    }),
    lesson({
      id: "lobs-overheads", title: "Lobs, overheads, and specialty-shot reference", optional: true, evidence: "Advanced technique · Safety guidance", sourceIds: ["R5", "B1", "R13", "H1"], illustration: art("advanced-trick-shots", "A player judges a lob while a partner maintains safe spacing.", "Specialty shots are optional; safe recovery is the core decision."),
      outcome: "Choose a lob or overhead in suitable conditions and recognise specialty shots without treating them as requirements.", prerequisites: ["volleys", "transition-movement"], mastery: "Make safe lob/overhead decisions; performing a specialty shot is never required.",
      pages: [
        page("lob-options", "A lob is a choice", "An offensive lob and a pressured defensive lob solve different problems. Consider opponent position, space, sun/wind, balance, and partner safety.", { sourceIds: ["B1", "R13"] }),
        page("overhead-recovery", "Recover with visual control", "For an overhead, turn and move while keeping sight of the ball. Do not encourage blind backpedaling; simplify or let a partner help when needed.", { sourceIds: ["R5", "H1"] }),
        check("lob-safety", "Choose the safer response", "A high ball goes over your shoulder with limited room behind you.", "What is the useful first priority?", ["Turn with visual control and communicate", "Blindly run backward at top speed", "Swing before locating the ball"], 0, ["H1", "R5"], { kind: "scenario" }),
        check("specialty-context", "Keep the shot optional", "Around-the-post, Erne, and Bert are advanced court-context shots.", "How should a newer recreational learner treat them?", ["Optional reference, not a core requirement", "Required before playing doubles", "A replacement for score knowledge"], 0, ["R13", "B1"], { kind: "retrieval" }),
        optional("specialty-gallery", "Specialty-shot gallery", "Browse ATP, Erne, and Bert definitions with complete court context. Bookmark if useful; none blocks a strong recreational game.", ["R13", "B1"]),
      ],
    }),
    lesson({
      id: "formats-inclusive", title: "Singles, mini-singles, rally scoring, and inclusive formats", optional: true, duration: "9–11 min", evidence: "Official rule · Format variant", sourceIds: ["R1", "R2", "R6", "R11"], illustration: art("adaptive-play", "Players use a comparison guide for doubles, singles, and adaptive formats.", "Check the active format’s current rules before organised play."),
      outcome: "Identify how positioning and score calls change across major formats and verify the current rules.", prerequisites: ["side-outs-formats"], mastery: "Choose the correct reference and explain two differences between selected formats.",
      pages: [
        page("format-comparison", "One sport, several formats", "Traditional doubles side-out, singles, mini-singles, and provisional rally scoring can use different score or position conventions. Avoid turning one format into a universal rule.", { type: "visual explainer", sourceIds: ["R1", "R2", "R6"] }),
        page("inclusive-formats", "Inclusive rules have specifics", "Wheelchair, adaptive standing, and hybrid doubles include dedicated current provisions, including positioning and bounce allowances. Use the official source for details.", { sourceIds: ["R2", "R11"] }),
        check("format-reference", "Find the source", "A club announces wheelchair/adaptive hybrid doubles for a session.", "What is the correct next step?", ["Open the current official adaptive rule reference", "Use the two-bounce explanation as the whole rule", "Assume traditional doubles covers every detail"], 0, ["R2", "R11"], { kind: "scenario" }),
        check("format-difference", "Name a difference", "Format changes can affect player count, score-call length, service/position anchors, point award, or bounce allowances.", "Which is a useful comparison question?", ["What changes in score call and positioning?", "Which paddle brand is required?", "Can we skip the pre-serve score call?"], 0, ["R1", "R6"], { kind: "retrieval" }),
      ],
    }),
    lesson({
      id: "match-review", title: "Match review and a personal practice plan", optional: true, duration: "8–10 min", evidence: "Learning design · Coaching process", sourceIds: ["L1", "L2", "L3", "L4", "R13"], illustration: art("warmup-recovery", "A player records one focused practice cue after a game.", "Use one constraint at a time and revisit it later."),
      outcome: "Identify one performance constraint, choose a focused drill, schedule retrieval, and test transfer in play.", prerequisites: ["first-game-rehearsal"], mastery: "Create a small practice plan without implying an official skill rating.",
      pages: [
        page("observe", "Observe one pattern", "Record three rallies or reconstruct them from memory. Tag serve/return, transition, kitchen, position, decision, or rule; no camera is required.", { sourceIds: ["L1"] }),
        page("choose-constraint", "Choose one constraint", "Pick the issue with the largest repeat effect rather than fixing every visible detail. A clear constraint makes a small drill meaningful.", { sourceIds: ["L1", "L2"] }),
        page("practice-transfer", "Practise, then test transfer", "Use a predictable drill until the goal is understood, then add a variable or point-like condition. Schedule a delayed check rather than only repeating immediately.", { sourceIds: ["L2", "L3", "L4"] }),
        reflection("personal-plan", "Write a personal plan", "Choose one cue, one drill, one later retrieval date, and one game-like success measure. Continue, simplify, or advance based on what you observe.", "Save the smallest next practice plan.", ["L1", "L2", "L3", "L4"]),
        optional("review-log-reference", "Reusable review log", "Use the log as a memory aid. It should never output a composite skill score or claim a USA Pickleball rating.", ["R13", "L2"]),
      ],
    }),
  ],
};

export const curriculumUnits = [unit1, unit2, unit3, unit4, unit5, unit6, unit7];

export const entryRoutes = [
  { id: "never-played", label: "I have never played", detail: "Start with court orientation and a safe setup.", route: "unit", resultTitle: "A calm first route.", resultBody: "Begin with court landmarks, a safe setup, and a manageable first rally." },
  { id: "first-game-essentials", label: "I need to play soon", detail: "Follow a 45–60 minute first-game essentials playlist.", route: "playlist", resultTitle: "First Game Essentials", resultBody: "This practical playlist keeps the rule and court context needed for a first game in one useful order.", lessonIds: ["court-orientation", "ready-position", "kitchen-rule", "serve-legally", "two-bounce-opening", "opening-rally", "doubles-scoring", "rotation-positions", "fair-calls", "first-game-rehearsal"] },
  { id: "consistency", label: "I play but lack consistency", detail: "Use five short questions to find Unit 4 or a deep-dive recommendation.", route: "diagnostic", resultTitle: "A useful next focus.", resultBody: "Your answers guide a Unit 4 or Unit 6 recommendation. This is orientation, not a rating." },
  { id: "specific-answer", label: "I want a specific answer", detail: "Search official rules, visual skills, drills, and sources without enrolling in a path.", route: "library", resultTitle: "Find the answer you need.", resultBody: "The Library separates current-rule answers from coaching options and keeps sources visible." },
];

// These are deliberately answer-shaped Library records, not a duplicate of
// the interactive curriculum. They make urgent rule searches useful while
// keeping the full lesson experience inside the canonical lesson route.
export const libraryEntries = [
  { id: "court-guide", title: "Court lines and service boxes", summary: "The baseline is at the back and the sidelines bound the sides. The centerline divides service courts; a serve travels diagonally into the opposite service court.", description: "Find the baseline, sidelines, centerline, kitchen, and diagonal service destination.", tag: "Official rule", lessonId: "court-orientation", sourceIds: ["R1", "R3"] },
  { id: "kitchen-guide", title: "Kitchen / non-volley-zone rule", summary: "The non-volley zone restricts volleying; a player may enter it and hit a ball after it bounces. Touching the zone or its line while volleying, including through volley momentum, is a fault.", description: "When kitchen entry is allowed, when a volley is a fault, and why momentum matters.", tag: "Official rule", lessonId: "kitchen-rule", sourceIds: ["R1", "R2"] },
  { id: "serve-guide", title: "Legal serve and serve target", summary: "Serve from behind the baseline within the serving-area extensions, diagonally beyond the non-volley zone. Volley and drop serves have different contact requirements; consult the official rules for details.", description: "Volley and drop serve context, baseline position, diagonal target, and the non-volley-zone line.", tag: "Official rule", lessonId: "serve-legally", sourceIds: ["R1", "R2"] },
  { id: "two-bounce-guide", title: "Two-bounce opening", summary: "The receiving team lets the serve bounce before returning it. The serving team then lets the return bounce before hitting it; after both bounces, either team may volley where legal.", description: "Why the serve and the return must each bounce before ordinary volley play opens.", tag: "Official rule", lessonId: "two-bounce-opening", sourceIds: ["R1"] },
  { id: "score-guide", title: "Doubles score and player positions", summary: "Traditional doubles uses server score, receiver score, then server number. Call the score before serving; score parity helps identify the correct side when restoring positions.", description: "Call the three-number score, understand server number, and restore positions after a question.", tag: "Official rule", lessonId: "doubles-scoring", sourceIds: ["R1", "R6"] },
  { id: "calls-guide", title: "Faults, line calls, and fair play", summary: "A fault is a rule violation. Call a ball out promptly when you see space between it and the line; if unsure, treat it as in. Ask calmly to confirm a disputed score.", description: "Use fault language accurately, make fair calls, and resolve a score question calmly.", tag: "Rules & sportsmanship", lessonId: "fair-calls", sourceIds: ["R1", "R7"] },
  { id: "adaptive-guide", title: "Adaptive, wheelchair, and inclusive play", summary: "Wheelchair, adaptive standing, and hybrid play have dedicated provisions. Consult the official adaptive and wheelchair references for the format in use, and ask local organizers about access supports and conventions.", description: "Open the current adaptive rule reference and distinguish specific rules from local convention.", tag: "Safety & access", lessonId: "open-play", sourceIds: ["R2", "R11"] },
  { id: "safety-guide", title: "Safe court setup and lower-impact options", summary: "Scan for hazards such as wet patches and loose balls, and prepare gradually. Seated practice, smaller movements, extra recovery, or reading-only practice are options.", description: "Court scan, gradual preparation, equipment comfort, and seated or reduced-movement routes.", tag: "Safety & access", lessonId: "equipment-safety", sourceIds: ["H1", "H2", "R11"] },
  { id: "third-shot-guide", title: "Third-shot choice: drop, drive, or safer continuation", summary: "A low or deep return often favors a controlled drop; a shorter or higher ball may invite a drive. When off balance, consider a high-margin continuation.", description: "Use height, depth, balance, and opponent position to choose an option rather than force a formula.", tag: "Coaching guidance", lessonId: "third-shot-choice", sourceIds: ["R9", "P1"] },
  { id: "formats-guide", title: "Singles, mini-singles, and scoring formats", summary: "Traditional doubles, singles, mini-singles, and rally scoring can use different scoring or position conventions. Confirm the format and its current rules before play.", description: "Compare format-specific score calls and positioning anchors before organised play.", tag: "Official rule", lessonId: "formats-inclusive", sourceIds: ["R1", "R2", "R11"] },
];

export const legacyLessonAliases = {
  "court-kitchen": { defaultLessonId: "court-orientation", unfinished: ["court-orientation", "kitchen-rule"] },
  "gear-grip": { defaultLessonId: "equipment-safety", unfinished: ["equipment-safety", "ready-position"] },
  "ready-position": "ready-position",
  "serve-basics": { defaultLessonId: "serve-legally", unfinished: ["serve-legally", "serve-placement"] },
  "two-bounce": { defaultLessonId: "two-bounce-opening", unfinished: ["two-bounce-opening", "opening-rally"] },
  "return-reset": { defaultLessonId: "two-bounce-opening", unfinished: ["two-bounce-opening", "drop-reset"] },
  "doubles-score": "doubles-scoring",
  "side-out": { defaultLessonId: "rotation-positions", unfinished: ["rotation-positions", "side-outs-formats"] },
  "dink-volley": { defaultLessonId: "volleys", unfinished: ["volleys", "dinks"] },
  "court-position": { defaultLessonId: "transition-movement", unfinished: ["transition-movement", "partner-communication"] },
  "faults-calls": "fair-calls",
  "open-play": "open-play",
  "game-ready": "first-game-rehearsal",
};

export function getAllLessons() {
  return curriculumUnits.flatMap((unit) => unit.lessons.map((item) => ({ ...item, unitId: unit.id, unitNumber: unit.number, optional: Boolean(item.optional || unit.optional) })));
}

export function getLesson(id) {
  return getAllLessons().find((item) => item.id === id) || null;
}

export function getUnitForLesson(id) {
  return curriculumUnits.find((unit) => unit.lessons.some((item) => item.id === id)) || null;
}

export function resolveLegacyLessonId(id, completedLessonIds = []) {
  const alias = legacyLessonAliases[id];
  if (!alias) return null;
  if (typeof alias === "string") return alias;
  const completed = new Set(completedLessonIds);
  return alias.unfinished.find((lessonId) => !completed.has(lessonId)) || alias.defaultLessonId;
}
