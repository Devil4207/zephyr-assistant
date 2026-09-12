const $ = (selector) => document.querySelector(selector);

const micButton = $("#micButton");
const micLabel = $("#micLabel");
const messages = $("#messages");
const statusBadge = $("#statusBadge");
const textForm = $("#textForm");
const textInput = $("#textInput");
const languageSelect = $("#languageSelect");
const speakToggle = $("#speakToggle");
const memoryList = $("#memoryList");
const imagePrompt = $("#imagePrompt");
const imageResult = $("#imageResult");

let memories = JSON.parse(localStorage.getItem("zephyr_memories") || "[]");
let recognition = null;
let isListening = false;

const languageNames = {
  "en-US": "English",
  "hi-IN": "Hindi",
  "ur-PK": "Urdu",
  "ja-JP": "Japanese",
  "nl-NL": "Dutch",
  "fr-FR": "French",
  "de-DE": "German",
  "es-ES": "Spanish",
  "it-IT": "Italian",
  "pt-PT": "Portuguese",
  "ko-KR": "Korean",
  "zh-CN": "Chinese"
};

function setStatus(text, active = false) {
  statusBadge.textContent = text;
  statusBadge.style.color = active ? "#ff728f" : "#53e0a1";
}

function addMessage(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className =
    sender === "user"
      ? "message user-message"
      : "message assistant-message";

  wrapper.innerHTML = `
    <div class="message-avatar">${sender === "user" ? "U" : "Z"}</div>
    <div>
      <strong>${sender === "user" ? "You" : "Zephyr"}</strong>
      <p></p>
    </div>
  `;

  wrapper.querySelector("p").textContent = text;
  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

function speak(text) {
  if (!speakToggle.checked || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageSelect.value;
  utterance.rate = 0.96;
  utterance.pitch = 0.9;
  utterance.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(languageSelect.value.slice(0, 2).toLowerCase())
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function saveMemories() {
  localStorage.setItem("zephyr_memories", JSON.stringify(memories));
  renderMemories();
}

function renderMemories() {
  memoryList.innerHTML = "";

  if (!memories.length) {
    memoryList.innerHTML = `<div class="empty-memory">No memories saved yet.</div>`;
    return;
  }

  memories.forEach((memory, index) => {
    const item = document.createElement("div");
    item.className = "memory-item";
    item.textContent = `${index + 1}. ${memory}`;
    memoryList.appendChild(item);
  });
}

function findMemoryCommand(text) {
  const lower = text.toLowerCase();

  const triggers = [
    "remember that ",
    "remember ",
    "save that ",
    "save "
  ];

  const trigger = triggers.find((item) => lower.startsWith(item));

  if (!trigger) return null;

  const memory = text.slice(trigger.length).trim();

  if (!memory) return null;

  memories.push(memory);
  saveMemories();

  return `Okay, I will remember that ${memory}.`;
}

function openWebsiteCommand(text) {
  const lower = text.toLowerCase();

  const sites = [
    {
      words: ["youtube"],
      url: "https://www.youtube.com",
      name: "YouTube"
    },
    {
      words: ["gmail", "email"],
      url: "https://mail.google.com",
      name: "Gmail"
    },
    {
      words: ["drive", "google drive"],
      url: "https://drive.google.com",
      name: "Google Drive"
    },
    {
      words: ["calendar", "google calendar"],
      url: "https://calendar.google.com",
      name: "Google Calendar"
    },
    {
      words: ["google"],
      url: "https://www.google.com",
      name: "Google"
    },
    {
      words: ["maps", "google maps"],
      url: "https://maps.google.com",
      name: "Google Maps"
    },
    {
      words: ["spotify"],
      url: "https://open.spotify.com",
      name: "Spotify"
    }
  ];

  const openIntent =
    lower.includes("open") ||
    lower.includes("launch") ||
    lower.includes("go to");

  if (!openIntent) return null;

  const site = sites.find((candidate) =>
    candidate.words.some((word) => lower.includes(word))
  );

  if (!site) return null;

  window.open(site.url, "_blank", "noopener,noreferrer");

  return `Opening ${site.name}.`;
}

async function askAssistant(text) {
  const language = languageNames[languageSelect.value] || "English";

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: text,
      language,
      memory: memories.join("\n")
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Assistant request failed.");
  }

  return data.reply;
}

async function processCommand(text) {
  const cleanText = text.trim();

  if (!cleanText) return;

  addMessage("user", cleanText);
  setStatus("Thinking...");

  const memoryReply = findMemoryCommand(cleanText);

  if (memoryReply) {
    addMessage("assistant", memoryReply);
    speak(memoryReply);
    setStatus("Ready");
    return;
  }

  const websiteReply = openWebsiteCommand(cleanText);

  if (websiteReply) {
    addMessage("assistant", websiteReply);
    speak(websiteReply);
    setStatus("Ready");
    return;
  }

  try {
    const reply = await askAssistant(cleanText);
    addMessage("assistant", reply);
    speak(reply);
  } catch (error) {
    addMessage(
      "assistant",
      "I could not connect to the assistant server. Please check your server configuration."
    );
    console.error(error);
  }

  setStatus("Ready");
}

function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micButton.disabled = true;
    micLabel.textContent = "Speech unavailable";
    setStatus("Use text input");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micButton.classList.add("recording");
    micLabel.textContent = "Listening...";
    setStatus("Listening...", true);
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    processCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error(event.error);
    setStatus("Microphone error");
  };

  recognition.onend = () => {
    isListening = false;
    micButton.classList.remove("recording");
    micLabel.textContent = "Tap to talk";

    if (statusBadge.textContent === "Listening...") {
      setStatus("Ready");
    }
  };
}

micButton.addEventListener("click", () => {
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
    return;
  }

  recognition.lang = languageSelect.value;
  recognition.start();
});

textForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = textInput.value.trim();

  if (!value) return;

  textInput.value = "";
  processCommand(value);
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", () => {
    processCommand(button.dataset.command);
  });
});

$("#clearChatButton").addEventListener("click", () => {
  messages.innerHTML = "";
  addMessage("assistant", "Conversation cleared.");
});

$("#clearMemoryButton").addEventListener("click", () => {
  memories = [];
  saveMemories();
  addMessage("assistant", "Your local memories have been cleared.");
});

$("#generateImageButton").addEventListener("click", async () => {
  const prompt = imagePrompt.value.trim();

  if (!prompt) {
    imageResult.textContent = "Please enter an image description first.";
    return;
  }

  imageResult.textContent = "Generating...";

  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (data.demo) {
      imageResult.textContent = data.message;
      return;
    }

    const imageUrl =
      data.image?.data?.[0]?.url ||
      data.image?.url ||
      data.image?.images?.[0]?.url;

    if (!imageUrl) {
      imageResult.textContent =
        "The image provider responded, but no image URL was found.";
      return;
    }

    imageResult.innerHTML = "";
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = prompt;
    imageResult.appendChild(image);
  } catch (error) {
    console.error(error);
    imageResult.textContent = "Image generation failed.";
  }
});

const loginModal = $("#loginModal");

$("#loginButton").addEventListener("click", () => {
  loginModal.classList.remove("hidden");
});

$("#closeLoginButton").addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

$("#demoLoginButton").addEventListener("click", () => {
  const email = $("#emailInput").value.trim();

  if (!email) {
    alert("Enter an email address.");
    return;
  }

  localStorage.setItem("zephyr_user", email);
  $("#loginButton").textContent = email.split("@")[0];
  loginModal.classList.add("hidden");

  addMessage("assistant", `Welcome, ${email.split("@")[0]}.`);
});

function restoreLogin() {
  const user = localStorage.getItem("zephyr_user");

  if (user) {
    $("#loginButton").textContent = user.split("@")[0];
  }
}

renderMemories();
restoreLogin();
setupSpeechRecognition();

if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
}
