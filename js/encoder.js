// ---- Constants ----
const MAX_SKU_LENGTH = 13;

// ---- Utility: format carat to 3-char string ----
function formatCaratTo3Chars(rawValue) {
  if (!rawValue) return "000";

  const value = parseFloat(rawValue);
  if (Number.isNaN(value) || value <= 0) return "000";

  if (value < 10) {
    // 0.10 -> "010", 8.5 -> "850"
    const scaled = Math.round(value * 100); // two decimals
    return String(scaled).padStart(3, "0"); // ensure 3 chars
  }

  // 10 or more: 12.00 -> "12T", 13.5 -> "13T"
  const whole = Math.floor(value);
  const code = String(whole) + "T";

  // For values like 100+, still keep only 3 chars
  return code.slice(0, 3);
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

  // 3–5: CARAT OR GEMSTONE
  const gemstoneGroup = document.getElementById("gemstone-group");
  const caratGroup = document.getElementById("carat-group");
  const gemstoneEl = document.getElementById("gemstone");
  const caratEl = document.getElementById("carat");

  let gemstoneCode = "";
  let caratCodeRaw = "";

  if (gemstoneGroup && gemstoneGroup.style.display !== "none") {
    gemstoneCode = (gemstoneEl.value || "").trim();
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

  // 6: SIZE (conditionally required)
  const subCatGroup = document.getElementById("sub-category-group");
  const subCatEl = document.getElementById("sub-category");
  let size = "";
  if (subCatGroup && subCatGroup.style.display !== "none") {
    size = (subCatEl.value || "").trim();
  }

  const missing = [];

  // Always required
  if (!stone) {
    missing.push("Stone Type");
    stoneEl.classList.add("field-error");
  }

  if (!style) {
    missing.push("Style");
    styleEl.classList.add("field-error");
  }

  // Either gemstone OR carat required
  if (!gemstoneCode && !caratCodeRaw) {
    missing.push("Carat / Gemstone");
    if (gemstoneGroup && gemstoneGroup.style.display !== "none") {
      gemstoneEl.classList.add("field-error");
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

  // Size required only when style is Necklace (N), Ring (R), or Bangle/Bracelet (B)
  const styleNeedsSize = ["N", "R", "B"].includes(style);
  if (styleNeedsSize) {
    if (!size) {
      missing.push("Size");
      if (subCatGroup && subCatGroup.style.display !== "none") {
        subCatEl.classList.add("field-error");
      }
    }
  }

  if (missing.length > 0) {
    errorBox.textContent =
      "Please fill all required fields: " + missing.join(", ");
    errorBox.style.display = "block";

    document.getElementById("encoder-output").textContent =
      "Generated SKU will appear here.";
    return;
  }

  // ---- All required fields present, build SKU ----

  // 1: stone (1 char)
  const stoneChar = stone.slice(0, 1);

  // 2: style (1 char)
  const styleChar = style.slice(0, 1);

  // 3–5: carat or gemstone (3 chars)
  let pos3to5 = "000";
  if (gemstoneCode) {
    pos3to5 = gemstoneCode.slice(0, 3);
  } else {
    pos3to5 = formatCaratTo3Chars(caratCodeRaw);
  }

  // 6: metal option (1 char)
  const pos6 = metalOption.slice(0, 1);

  // 7–12: unique ID (6 chars)
  let uniqueId = uniqueIdRaw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (uniqueId.length > 6) {
    uniqueId = uniqueId.slice(0, 6);
  } else {
    uniqueId = uniqueId.padEnd(6, "X");
  }

  // 13: size (1 char) or X if not applicable
  let pos13;
  if (styleNeedsSize) {
    pos13 = size.slice(0, 1); // already checked non-empty
  } else {
    pos13 = "X";
  }

  const raw =
    stoneChar + // 1
    styleChar + // 2
    pos3to5 + // 3-5
    pos6 + // 6
    uniqueId + // 7-12
    pos13; // 13

  const finalSku = raw.slice(0, MAX_SKU_LENGTH);
  document.getElementById("encoder-output").textContent = finalSku;
};

// ---- Copy output ----
window.copyEncoderOutput = function () {
  const text = document.getElementById("encoder-output").textContent.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).catch(() => {});
};

// ---- DOM wiring and dynamic dropdowns ----
document.addEventListener("DOMContentLoaded", function () {
  // ----- Style -> Size dropdown -----
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

  // ----- Stone Type -> Gemstone vs Carat + Gem Carat field -----
  const stoneSelect = document.getElementById("stone");
  const gemstoneGroup = document.getElementById("gemstone-group");
  const gemstoneSelect = document.getElementById("gemstone");
  const caratGroup = document.getElementById("carat-group");
  const caratInput = document.getElementById("carat");

  const gemCaratGroup = document.getElementById("gem-carat-group");
  const gemCaratInput = document.getElementById("gem-carat");

  function updateStoneDetails() {
    const stoneValue = stoneSelect.value;

    if (stoneValue === "G") {
      // Gemstone selected
      gemstoneGroup.style.display = "block";
      gemCaratGroup.style.display = "block"; // show "Carat (If applicable)"
      caratGroup.style.display = "none";
      caratInput.value = "";
    } else {
      // Non-gemstone: use main Carat input
      gemstoneGroup.style.display = "none";
      gemstoneSelect.value = "";
      gemCaratGroup.style.display = "none";
      gemCaratInput.value = "";
      caratGroup.style.display = "block";
    }
  }

  stoneSelect.addEventListener("change", updateStoneDetails);
  updateStoneDetails();

  // ----- Metal Type -> Metal Option -----
  const metalTypeSelect = document.getElementById("metal-type");
  const metalOptionGroup = document.getElementById("metal-option-group");
  const metalOptionSelect = document.getElementById("metal-option");
  const allMetalOptions = Array.from(metalOptionSelect.options);

  function updateMetalOptions() {
    const typeValue = metalTypeSelect.value;

    if (!typeValue) {
      metalOptionGroup.style.display = "none";
      metalOptionSelect.value = "";
      return;
    }

    metalOptionGroup.style.display = "block";

    allMetalOptions.forEach((opt) => {
      const parent = opt.getAttribute("data-parent");
      if (!parent) {
        opt.hidden = false;
        return;
      }
      opt.hidden = parent !== typeValue;
    });

    metalOptionSelect.value = "";
  }

  metalTypeSelect.addEventListener("change", updateMetalOptions);
  updateMetalOptions();
});
