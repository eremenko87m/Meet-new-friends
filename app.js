const phoneACards = [
  { name: "Anna Petrova", file: "anna-petrova.png" },
  { name: "Jack Brown", file: "jack-brown.png" },
  { name: "Emma Davis", file: "emma-davis.png" },
  { name: "Nikos Petrou", file: "nikos-petrou.png" },
  { name: "Sofia Rossi", file: "sofia-rossi.png" },
  { name: "Pablo Garcia", file: "pablo-garcia.png" },
  { name: "Zosia Nowak", file: "zosia-nowak.png" },
  { name: "Wei Chen", file: "wei-chen.png" },
];

const phoneBCards = [
  { name: "Max Ivanov", file: "max-ivanov.png" },
  { name: "Lily White", file: "lily-white.png" },
  { name: "Ben Miller", file: "ben-miller.png" },
  { name: "Eleni Papas", file: "eleni-papas.png" },
  { name: "Luca Ricci", file: "luca-ricci.png" },
  { name: "Lucia Lopez", file: "lucia-lopez.png" },
  { name: "Adam Kowalski", file: "adam-kowalski.png" },
  { name: "Mei Wang", file: "mei-wang.png" },
];

const allCards = [...phoneACards, ...phoneBCards];
const cardPath = "assets/cards/";

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function makePhoneDeck(cards, elements) {
  let queue = [];
  let lastCard = null;
  let position = 0;

  function refill() {
    queue = shuffle(cards);
    position = 0;

    if (lastCard && queue.length > 1 && queue[0].file === lastCard.file) {
      [queue[0], queue[1]] = [queue[1], queue[0]];
    }
  }

  function drawCard() {
    if (queue.length === 0) {
      refill();
    }

    const nextCard = queue.shift();
    lastCard = nextCard;
    position += 1;

    elements.stage.classList.remove("is-changing");
    void elements.stage.offsetWidth;

    elements.image.src = `${cardPath}${nextCard.file}`;
    elements.image.alt = `${nextCard.name} — World Friends Club card`;
    elements.counter.textContent = `Card ${position} / ${cards.length}`;
    elements.stage.classList.add("is-changing");
  }

  elements.button.addEventListener("click", drawCard);
  drawCard();

  return { drawCard };
}

function makeSingleDeck(cards, elements) {
  let queue = [];
  let lastCard = null;
  let position = 0;
  let currentCard = null;

  function refill() {
    queue = shuffle(cards);
    position = 0;

    if (lastCard && queue.length > 1 && queue[0].file === lastCard.file) {
      [queue[0], queue[1]] = [queue[1], queue[0]];
    }
  }

  function showInbox() {
    elements.cardView.classList.add("is-hidden");
    elements.inbox.classList.remove("is-hidden");
  }

  function openCard() {
    if (!currentCard) return;
    elements.inbox.classList.add("is-hidden");
    elements.cardView.classList.remove("is-hidden");

    elements.stage.classList.remove("is-changing");
    void elements.stage.offsetWidth;
    elements.stage.classList.add("is-changing");
  }

  function drawCard() {
    if (queue.length === 0) {
      refill();
    }

    currentCard = queue.shift();
    lastCard = currentCard;
    position += 1;

    const source = `${cardPath}${currentCard.file}`;
    elements.image.src = source;
    elements.image.alt = `${currentCard.name} — World Friends Club card`;
    elements.thumb.src = source;
    elements.thumb.alt = `${currentCard.name} profile preview`;
    elements.messageName.textContent = currentCard.name;
    elements.counter.textContent = `Friend ${position} / ${cards.length}`;
    showInbox();
  }

  elements.openButton.addEventListener("click", openCard);
  elements.backButton.addEventListener("click", showInbox);
  elements.nextButton.addEventListener("click", drawCard);

  drawCard();

  return { drawCard, showInbox };
}

function preload(cards) {
  cards.forEach((card) => {
    const image = new Image();
    image.src = `${cardPath}${card.file}`;
  });
}

preload(allCards);

const phoneADeck = makePhoneDeck(phoneACards, {
  image: document.querySelector("#card-a"),
  stage: document.querySelector("#stage-a"),
  button: document.querySelector("#draw-a"),
  counter: document.querySelector("#counter-a"),
});

const phoneBDeck = makePhoneDeck(phoneBCards, {
  image: document.querySelector("#card-b"),
  stage: document.querySelector("#stage-b"),
  button: document.querySelector("#draw-b"),
  counter: document.querySelector("#counter-b"),
});

const singleDeck = makeSingleDeck(allCards, {
  image: document.querySelector("#card-single"),
  thumb: document.querySelector("#single-thumb"),
  messageName: document.querySelector("#single-message-name"),
  stage: document.querySelector("#stage-single"),
  inbox: document.querySelector("#single-inbox"),
  cardView: document.querySelector("#single-card-view"),
  openButton: document.querySelector("#open-single-card"),
  backButton: document.querySelector("#back-to-inbox"),
  nextButton: document.querySelector("#draw-single"),
  counter: document.querySelector("#counter-single"),
});

document.querySelector("#draw-both").addEventListener("click", () => {
  phoneADeck.drawCard();
  phoneBDeck.drawCard();
});

const modeScreen = document.querySelector("#mode-screen");
const workspace = document.querySelector("#game-workspace");
const singleMode = document.querySelector("#single-mode");
const pairMode = document.querySelector("#pair-mode");
const modeBack = document.querySelector("#mode-back");
const miniSteps = document.querySelector("#mini-steps");

function startMode(mode) {
  modeScreen.classList.add("is-hidden");
  workspace.classList.remove("is-hidden");
  modeBack.classList.remove("is-hidden");
  miniSteps.classList.add("is-hidden");

  if (mode === "single") {
    pairMode.classList.add("is-hidden");
    singleMode.classList.remove("is-hidden");
    singleDeck.showInbox();
  } else {
    singleMode.classList.add("is-hidden");
    pairMode.classList.remove("is-hidden");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function returnToModeChoice() {
  workspace.classList.add("is-hidden");
  singleMode.classList.add("is-hidden");
  pairMode.classList.add("is-hidden");
  modeScreen.classList.remove("is-hidden");
  modeBack.classList.add("is-hidden");
  miniSteps.classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelector("#choose-one").addEventListener("click", () => startMode("single"));
document.querySelector("#choose-two").addEventListener("click", () => startMode("pair"));
modeBack.addEventListener("click", returnToModeChoice);
