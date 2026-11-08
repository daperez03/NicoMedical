const WHATSAPP_NUMBER = "50687843394";

function sendWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function getQuantity() {
  const quantityInput = document.getElementById("quantity");
  return quantityInput ? Number.parseInt(quantityInput.value, 10) : 1;
}

// --------------------------------------------------
// Productos generales
// --------------------------------------------------

const productOrderButton = document.getElementById("product-order");

if (productOrderButton) {
  productOrderButton.addEventListener("click", () => {
    const product = productOrderButton.dataset.product;
    const price = Number(productOrderButton.dataset.price);
    const quantityInput = document.getElementById("quantity");
    const quantity = getQuantity();
    const variantInput = document.getElementById("variant");

    if (!Number.isInteger(quantity) || quantity < 1) {
      alert("Ingrese una cantidad válida.");
      return;
    }

    if (quantityInput.max && quantity > Number(quantityInput.max)) {
      alert(`La cantidad máxima disponible es ${quantityInput.max}.`);
      return;
    }

    let variant = "";

    if (variantInput) {
      variant = variantInput.value;
    }

    const subtotal = price * quantity;

    let message = `Hola, quisiera consultar por el siguiente producto:\n\n`;
    message += `Producto: ${product}\n`;

    if (variant) {
      message += `Variante: ${variant}\n`;
    }

    message += `Cantidad: ${quantity}\n`;
    message += `Precio unitario: ₡${price.toLocaleString("es-CR")}\n`;
    message += `Subtotal: ₡${subtotal.toLocaleString("es-CR")}\n\n`;
    message += `¿Me podrían confirmar la disponibilidad?`;

    sendWhatsApp(message);
  });
}

// --------------------------------------------------
// Actualización de variantes: tijeras y medias
// --------------------------------------------------

const variantSelect = document.getElementById("variant");

if (variantSelect) {
  const quantityInput = document.getElementById("quantity");
  const stockLabel = document.getElementById("variant-stock");
  const productImage = document.getElementById("product-image");

  function updateVariant() {
    const selectedOption = variantSelect.selectedOptions[0];

    if (!selectedOption) return;

    const stock = Number(selectedOption.dataset.stock);

    if (Number.isFinite(stock) && quantityInput) {
      quantityInput.max = stock;

      if (Number(quantityInput.value) > stock) {
        quantityInput.value = stock;
      }

      if (Number(quantityInput.value) < 1) {
        quantityInput.value = 1;
      }
    }

    if (stockLabel && Number.isFinite(stock)) {
      stockLabel.textContent = `Existencias: ${stock} unidades`;
    }

    if (productImage && selectedOption.dataset.image) {
      productImage.src = selectedOption.dataset.image;
    }
  }

  variantSelect.addEventListener("change", updateVariant);
  updateVariant();
}

// --------------------------------------------------
// Selección de uniformes
// --------------------------------------------------

const uniformColor = document.getElementById("uniform-color");

if (uniformColor) {
  const uniformSize = document.getElementById("uniform-size");
  const uniformStock = document.getElementById("uniform-stock");
  const uniformQuantity = document.getElementById("uniform-qty");
  const uniformImage = document.getElementById("uniform-image");
  const uniformOrder = document.getElementById("uniform-order");

  function getUniformData() {
    const values = uniformColor.value.split("|");

    return {
      color: values[0],
      size: values[1],
      stock: Number(values[2]),
      image: values[3]
    };
  }

  function updateUniform() {
    const uniform = getUniformData();

    if (uniformSize) {
      uniformSize.value = uniform.size;
    }

    if (uniformStock) {
      uniformStock.textContent = `Existencias: ${uniform.stock} unidad(es)`;
    }

    if (uniformQuantity) {
      uniformQuantity.max = uniform.stock;

      if (Number(uniformQuantity.value) > uniform.stock) {
        uniformQuantity.value = uniform.stock;
      }

      if (Number(uniformQuantity.value) < 1) {
        uniformQuantity.value = 1;
      }
    }

    if (uniformImage && uniform.image) {
      uniformImage.src = uniform.image;
    }
  }

  uniformColor.addEventListener("change", updateUniform);
  updateUniform();

  if (uniformOrder) {
    uniformOrder.addEventListener("click", () => {
      const uniform = getUniformData();
      const quantity = Number.parseInt(uniformQuantity.value, 10);

      if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Ingrese una cantidad válida.");
        return;
      }

      if (quantity > uniform.stock) {
        alert(`Solo hay ${uniform.stock} unidad(es) disponibles.`);
        return;
      }

      const price = 20000;
      const subtotal = price * quantity;

      let message = "Hola, quisiera consultar por el siguiente uniforme:\n\n";
      message += `Producto: Uniforme de dos piezas\n`;
      message += `Color: ${uniform.color}\n`;
      message += `Talla: ${uniform.size}\n`;
      message += `Cantidad: ${quantity}\n`;
      message += `Precio unitario: ₡${price.toLocaleString("es-CR")}\n`;
      message += `Subtotal: ₡${subtotal.toLocaleString("es-CR")}\n\n`;
      message += "¿Me podrían confirmar la disponibilidad?";

      sendWhatsApp(message);
    });
  }
}