// encoder.js - Full version with Gemstone Autocomplete

// ---- Constants ----
const MAX_SKU_LENGTH = 13;

// NEW: Auto-select single-option metals
const singleOptionMetalTypes = {
  'SPC': 'S',   // SPEC - Special (S)
  'PLT': 'U'   // PLAT - Platinum (U)
};

// ---- Utility: format carat to 3-char string ----
function formatCaratTo3Chars(rawValue) {
  if (!rawValue) return "000";

  const value = parseFloat(rawValue);
  if (Number.isNaN(value) || value <= 0) return "000";

  if (value < 10) {
    const scaled = Math.round(value * 100);
    return String(scaled).padStart(3, "0");
  }

  const whole = Math.floor(value);
  const code = String(whole) + "T";
  return code.slice(0, 3);
}

// ---- Gemstone Autocomplete ----
let gemstoneList = [];

async function initGemstoneAutocomplete() {
  try {
    const response = await fetch("data/gemstones.json");
    gemstoneList = await response.json();
  } catch (error) {
    console.error("Failed to load gemstones:", error);
  }
}

function populateGemstoneDropdown(matches) {
  const dropdown = document.getElementById("gemstone-dropdown");
  console.log("Matches found:", matches.length); // DEBUG
  
  dropdown.innerHTML = "";

  if (matches.length === 0) {
    dropdown.style.display = "none";
    console.log("No matches, hiding dropdown"); // DEBUG
    return;
  }

  matches.slice(0, 8).forEach((gem, index) => {
    const option = document.createElement("div");
    option.className = "autocomplete-option";
    option.textContent = `${gem.name} (${gem.code})`;
    option.dataset.code = gem.code;
    option.onclick = () => selectGemstone(gem);
    dropdown.appendChild(option);
    console.log(`Added option ${index + 1}:`, gem.name); // DEBUG
  });

  dropdown.style.display = "block";
  dropdown.style.background = "yellow"; // TEMP VISUAL CONFIRMATION
  console.log("Dropdown should be visible now"); // DEBUG
}

function selectGemstone(gem) {
  document.getElementById("gemstone-input").value = `${gem.name} (${gem.code})`;
  document.getElementById("gemstone").value = gem.code;
  document.getElementById("gemstone-dropdown").style.display = "none";
}

function setupGemstoneInput() {
  const input = document.getElementById("gemstone-input");
  let timeout;

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const query = input.value.toLowerCase().trim();

    timeout = setTimeout(() => {
      if (query.length < 2) {
        document.getElementById("gemstone-dropdown").style.display = "none";
        return;
      }

      const matches = gemstoneList.filter(gem =>
        gem.name.toLowerCase().includes(query) ||
        gem.code.toLowerCase().includes(query)
      );

      populateGemstoneDropdown(matches);
    }, 200);
  });

  input.addEventListener("focus", () => {
    if (input.value) populateGemstoneDropdown(gemstoneList);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      document.getElementById("gemstone-dropdown").style.display = "none";
    }, 200);
  });
}

// ---- SKU generation ----
window.generateEncodedSKU = function () {
  // Clear previous error state
  const errorBox = document.getElementById("sku-error");
  errorBox.style.display = "none";
  errorBox.textContent = "";

  const errorFields = document.querySelectorAll(".field-error");
  errorFields.forEach((el) => el.classList.remove("field-error"));

  // 1: STONE TYPE
  const stoneEl = document.getElementById("stone");
  const stone = (stoneEl.value || "").trim();

  // 2: STYLE
  const styleEl = document.getElementById("style");
  const style = (styleEl.value || "").trim();

  // 3–5: CARAT OR GEMSTONE (UPDATED for autocomplete)
  const gemstoneGroup = document.getElementById("gemstone-group");
  const caratGroup = document.getElementById("carat-group");
  const gemstoneHidden = document.getElementById("gemstone"); // Hidden field
  const caratEl = document.getElementById("carat");

  let gemstoneCode = "";
  let caratCodeRaw = "";

  if (gemstoneGroup && gemstoneGroup.style.display !== "none") {
    gemstoneCode = (gemstoneHidden.value || "").trim(); // Use hidden field
  } else if (caratGroup && caratGroup.style.display !== "none") {
    caratCodeRaw = (caratEl.value || "").trim();
  }

  // 4: METAL option
  const metalOptionGroup = document.getElementById("metal-option-group");
  const metalOptionEl = document.getElementById("metal-option");
  let metalOption = "";
  if (metalOptionGroup && metalOptionGroup.style.display !== "none") {
    metalOption = (metalOptionEl.value || "").trim();
  }

  // 5: UNIQUE IDENTIFIER
  const uniqueInput = document.getElementById("unique-id");
  let uniqueIdRaw = (uniqueInput.value || "").trim();

  // 6: SIZE
  const subCatGroup = document.getElementById("sub-category-group");
  const subCatEl = document.getElementById("sub-category");
  let size = "";
  if (subCatGroup && subCatGroup.style.display !== "none") {
    size = (subCatEl.value || "").trim();
  }

  const missing = [];

  if (!stone) {
    missing.push("Stone Type");
    stoneEl.classList.add("field-error");
  }

  if (!style) {
    missing.push("Style");
    styleEl.classList.add("field-error");
  }

  if (!gemstoneCode && !caratCodeRaw) {
    missing.push("Carat / Gemstone");
    if (gemstoneGroup && gemstoneGroup.style.display !== "none") {
      document.getElementById("gemstone-input").classList.add("field-error");
    } else if (caratGroup && caratGroup.style.display !== "none") {
      caratEl.classList.add("field-error");
    }
  }

  if (!metalOption) {
    missing.push("Metal");
    metalOptionEl.classList.add("field-error");
  }

  if (!uniqueIdRaw) {
    missing.push("Unique Identifier");
    uniqueInput.classList.add("field-error");
  }

  const styleNeedsSize = ["N", "R", "B"].includes(style);
  if (styleNeedsSize && !size) {
    missing.push("Size");
    if (subCatGroup && subCatGroup.style.display !== "none") {
      subCatEl.classList.add("field-error");
    }
  }

  if (missing.length > 0) {
    errorBox.textContent = "Please fill all required fields: " + missing.join(", ");
    errorBox.style.display = "block";
    document.getElementById("encoder-output").textContent = "Generated SKU will appear here.";
    return;
  }

  // Build SKU (same logic)
  const stoneChar = stone.slice(0, 1);
  const styleChar = style.slice(0, 1);
  let pos3to5 = gemstoneCode ? gemstoneCode.slice(0, 3) : formatCaratTo3Chars(caratCodeRaw);
  const pos6 = metalOption.slice(0, 1);

  let uniqueId = uniqueIdRaw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  uniqueId = uniqueId.length > 6 ? uniqueId.slice(0, 6) : uniqueId.padEnd(6, "X");

  const pos13 = styleNeedsSize ? size.slice(0, 1) : "X";

  const raw = stoneChar + styleChar + pos3to5 + pos6 + uniqueId + pos13;
  const finalSku = raw.slice(0, MAX_SKU_LENGTH);
  
  document.getElementById("encoder-output").textContent = finalSku;
};

// ---- Copy output ----
window.copyEncoderOutput = function () {
  const text = document.getElementById("encoder-output").textContent.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).catch(() => {});
};

// ---- DOM setup ----
document.addEventListener("DOMContentLoaded", async function () {
  // Load gemstones for autocomplete FIRST
  await initGemstoneAutocomplete();
  setupGemstoneInput();

  // ----- Style -> Size dropdown (unchanged) -----
  const styleSelect = document.getElementById("style");
  const subCategoryGroup = document.getElementById("sub-category-group");
  const subCategorySelect = document.getElementById("sub-category");
  const allSubOptions = Array.from(subCategorySelect.options);

  function updateSubCategoryVisibility() {
    const mainValue = styleSelect.value;
    const hasSize = ["N", "R", "B"].includes(mainValue);

    if (!hasSize) {
      subCategoryGroup.style.display = "none";
      subCategorySelect.value = "";
      return;
    }

    subCategoryGroup.style.display = "block";

    allSubOptions.forEach((opt) => {
      const parent = opt.getAttribute("data-parent");
      if (!parent) {
        opt.hidden = false;
        return;
      }
      opt.hidden = parent !== mainValue;
    });

    subCategorySelect.value = "";
  }

  styleSelect.addEventListener("change", updateSubCategoryVisibility);
  updateSubCategoryVisibility();

  // ----- Stone Type -> Gemstone vs Carat (UPDATED for autocomplete) -----
  const stoneSelect = document.getElementById("stone");
  const gemstoneGroup = document.getElementById("gemstone-group");
  const caratGroup = document.getElementById("carat-group");
  const caratInput = document.getElementById("carat");


  function updateStoneDetails() {
    const stoneValue = stoneSelect.value;

    if (stoneValue === "G") {
      gemstoneGroup.style.display = "block";
      caratGroup.style.display = "none";
      caratInput.value = "";
      document.getElementById("gemstone-input").value = "";
      document.getElementById("gemstone").value = "";
    } else {
      gemstoneGroup.style.display = "none";
      caratGroup.style.display = "block";
    }
  }


  stoneSelect.addEventListener("change", updateStoneDetails);
  updateStoneDetails();

  // ----- Metal Type -> Metal Option (unchanged) -----
  const metalTypeSelect = document.getElementById("metal-type");
  const metalOptionGroup = document.getElementById("metal-option-group");
  const metalOptionSelect = document.getElementById("metal-option");
  const allMetalOptions = Array.from(metalOptionSelect.options);

  function updateMetalOptions() {
    const metalTypeSelect = document.getElementById("metal-type");
    const metalOptionGroup = document.getElementById("metal-option-group");
    const metalOptionSelect = document.getElementById("metal-option");
    const allMetalOptions = Array.from(metalOptionSelect.options);
    
    const typeValue = metalTypeSelect.value;

    if (!typeValue) {
      metalOptionGroup.style.display = "none";
      metalOptionSelect.value = "";
      return;
    }

    metalOptionGroup.style.display = "block";

    // Filter options by metal type
    allMetalOptions.forEach((opt) => {
      const parent = opt.getAttribute("data-parent");
      if (!parent) {
        opt.hidden = false;
        return;
      }
      opt.hidden = parent !== typeValue;
    });

    // FIXED: Check auto-select BEFORE clearing value
    if (singleOptionMetalTypes[typeValue]) {
      const autoCode = singleOptionMetalTypes[typeValue];
      metalOptionSelect.value = autoCode;
      metalOptionSelect.disabled = true;
    } else {
      metalOptionSelect.disabled = false;
      metalOptionSelect.value = ""; // Only clear for multi-option types
    }
  }


  metalTypeSelect.addEventListener("change", updateMetalOptions);
  updateMetalOptions();
});