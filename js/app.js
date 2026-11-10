const WHATSAPP_NUMBER = "50687843394";
const INVENTORY_URL = "data/inventory.json";

function sendWhatsApp(message) {
  const url = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function getVariantsForProduct(inventory, productId) {
  const product = inventory.products?.[productId];

  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
    throw new Error(`No hay variantes de inventario configuradas para "${productId}".`);
  }

  const orderMultiple = product.orderMultiple ?? 1;
  if (!Number.isInteger(orderMultiple) || orderMultiple < 1) {
    throw new Error(`La cantidad por pedido no es válida para "${productId}".`);
  }

  const hasColor = product.variants.some((variant) => variant.color !== undefined);
  const hasSize = product.variants.some((variant) => variant.size !== undefined);
  const combinations = new Set();

  for (const variant of product.variants) {
    if (!Number.isInteger(variant.stock) || variant.stock < 0) {
      throw new Error(`Existencias inválidas para una variante de "${productId}".`);
    }

    for (const dimension of ["color", "size"]) {
      if (variant[dimension] !== undefined && typeof variant[dimension] !== "string") {
        throw new Error(`El campo "${dimension}" debe ser texto en "${productId}".`);
      }
    }

    if ((hasColor && !variant.color) || (hasSize && !variant.size)) {
      throw new Error(`Falta color o talla en una variante de "${productId}".`);
    }

    const combination = JSON.stringify([variant.color ?? "", variant.size ?? ""]);
    if (combinations.has(combination)) {
      throw new Error(`Hay variantes duplicadas en "${productId}".`);
    }
    combinations.add(combination);
  }

  return product.variants;
}

function uniqueValues(variants, dimension) {
  return [...new Set(variants.map((variant) => variant[dimension]).filter(Boolean))];
}

function setSelectOptions(select, values, selectedValue, variants, dimension) {
  select.replaceChildren();

  for (const value of values) {
    const option = document.createElement("option");
    const stock = variants
      .filter((variant) => variant[dimension] === value)
      .reduce((total, variant) => total + variant.stock, 0);

    option.value = value;
    option.textContent = stock > 0 ? value : `${value} (agotado)`;
    select.append(option);
  }

  if (values.includes(selectedValue)) {
    select.value = selectedValue;
  } else if (values.length > 0) {
    select.value = values[0];
  }
}

function initializeProductDetail(inventory) {
  const detail = document.querySelector("[data-inventory-product]");
  if (!detail) return;

  const productId = detail.dataset.inventoryProduct;
  const variants = getVariantsForProduct(inventory, productId);
  const controls = detail.querySelector("#variant-controls");
  const stockLabel = detail.querySelector("#variant-stock");
  const quantityInput = detail.querySelector("#quantity");
  const orderButton = detail.querySelector("#product-order");
  const status = detail.querySelector("#inventory-status");
  const productImage = detail.querySelector("#product-image");

  if (!quantityInput || !orderButton) {
    throw new Error(`Faltan controles de pedido para "${productId}".`);
  }

  const colorVariants = uniqueValues(variants, "color");
  const sizeVariants = uniqueValues(variants, "size");
  const selects = {};

  function addSelector(dimension, labelText) {
    if (!controls) return;

    const field = document.createElement("div");
    field.className = "field";

    const label = document.createElement("label");
    const select = document.createElement("select");
    const selectId = `inventory-${dimension}`;
    label.htmlFor = selectId;
    label.textContent = labelText;
    select.id = selectId;
    field.append(label, select);
    controls.append(field);
    selects[dimension] = select;
  }

  if (colorVariants.length > 0) addSelector("color", "Color");
  if (sizeVariants.length > 0) addSelector("size", "Talla");

  function getSelectedVariant() {
    return variants.find((variant) =>
      (!selects.color || variant.color === selects.color.value) &&
      (!selects.size || variant.size === selects.size.value)
    );
  }

  function updateVariantOptions() {
    if (selects.color) {
      setSelectOptions(selects.color, colorVariants, selects.color.value, variants, "color");
    }

    if (selects.size) {
      const availableSizes = uniqueValues(
        variants.filter((variant) => variant.color === selects.color?.value),
        "size"
      );
      setSelectOptions(selects.size, availableSizes, selects.size.value, variants, "size");
    }
  }

  function updateInventoryDisplay() {
    const variant = getSelectedVariant();
    const stock = variant?.stock ?? 0;
    const orderMultiple = inventory.products[productId].orderMultiple ?? 1;
    const maxOrderQuantity = Math.floor(stock / orderMultiple);

    quantityInput.min = maxOrderQuantity > 0 ? "1" : "0";
    quantityInput.max = String(maxOrderQuantity);
    quantityInput.step = "1";
    quantityInput.disabled = maxOrderQuantity === 0;

    const currentQuantity = Number.parseInt(quantityInput.value, 10);
    if (maxOrderQuantity === 0) {
      quantityInput.value = "0";
    } else if (!Number.isInteger(currentQuantity) || currentQuantity < 1) {
      quantityInput.value = "1";
    } else if (currentQuantity > maxOrderQuantity) {
      quantityInput.value = String(maxOrderQuantity);
    }

    if (stockLabel) {
      const unit = stock === 1 ? "unidad" : "unidades";
      let text = `Existencias: ${stock} ${unit}`;
      if (orderMultiple > 1) {
        text += ` (${maxOrderQuantity} grupos de ${orderMultiple} disponibles)`;
      }
      stockLabel.textContent = text;
    }

    if (productImage && variant?.image) {
      productImage.src = variant.image;
    }

    orderButton.disabled = maxOrderQuantity === 0;
    orderButton.setAttribute("aria-disabled", String(maxOrderQuantity === 0));
  }

  function handleOrder() {
    const variant = getSelectedVariant();
    const price = Number(orderButton.dataset.price);
    const quantity = Number.parseInt(quantityInput.value, 10);
    const orderMultiple = inventory.products[productId].orderMultiple ?? 1;
    const maxOrderQuantity = Math.floor((variant?.stock ?? 0) / orderMultiple);

    if (!Number.isInteger(quantity) || quantity < 1) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    if (!variant || quantity > maxOrderQuantity) {
      alert(`La cantidad máxima disponible es ${maxOrderQuantity}.`);
      return;
    }

    if (!Number.isFinite(price)) {
      throw new Error(`El precio del producto "${productId}" no es válido.`);
    }

    const product = orderButton.dataset.product;
    const subtotal = price * quantity;
    let message = "Hola, quisiera consultar por el siguiente producto:\n\n";
    message += `Producto: ${product}\n`;
    if (variant.color) message += `Color: ${variant.color}\n`;
    if (variant.size) message += `Talla: ${variant.size}\n`;
    message += `Cantidad: ${quantity}\n`;
    if (orderMultiple > 1) {
      message += `Unidades: ${quantity * orderMultiple}\n`;
    }
    message += `Precio unitario: ₡${price.toLocaleString("es-CR")}\n`;
    message += `Subtotal: ₡${subtotal.toLocaleString("es-CR")}\n\n`;
    message += "¿Me podrían confirmar la disponibilidad?";

    sendWhatsApp(message);
  }

  updateVariantOptions();
  updateInventoryDisplay();

  for (const select of Object.values(selects)) {
    select.addEventListener("change", () => {
      updateVariantOptions();
      updateInventoryDisplay();
    });
  }

  orderButton.addEventListener("click", handleOrder);

  if (status) {
    status.hidden = true;
  }
}

async function initializeInventory() {
  const detail = document.querySelector("[data-inventory-product]");
  const status = detail?.querySelector("#inventory-status");
  const orderButton = detail?.querySelector("#product-order");
  const quantityInput = detail?.querySelector("#quantity");

  if (orderButton) orderButton.disabled = true;
  if (quantityInput) quantityInput.disabled = true;

  try {
    const response = await fetch(INVENTORY_URL);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el inventario (${response.status}).`);
    }

    const inventory = await response.json();
    if (!inventory || typeof inventory.products !== "object") {
      throw new Error("El archivo de inventario no tiene el formato esperado.");
    }

    initializeProductDetail(inventory);
  } catch (error) {
    console.error("Error al cargar el inventario:", error);
    if (status) {
      status.textContent = "No se pudo cargar el inventario. Inténtalo de nuevo más tarde.";
      status.hidden = false;
    }
    if (orderButton) orderButton.disabled = true;
    if (quantityInput) quantityInput.disabled = true;
  }
}

initializeInventory();
