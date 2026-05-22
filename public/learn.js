document.addEventListener("DOMContentLoaded", async () => {
  const individualContainer = document.getElementById("individual-products-container");
  const packagesContainer = document.getElementById("packages-container");

  // Show PTE Academic by default
  await loadProducts("PTE Academic");

  // Handle Tab Switching (Simulated for this demo)
  const tabs = document.querySelectorAll('.tabs-container [role="tab"]');
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", async () => {
      // Update UI for active tab
      tabs.forEach(t => {
        t.classList.remove("mdc-tab--active", "mdc-tab-indicator--active");
        const indicator = t.querySelector(".mdc-tab-indicator");
        if (indicator) indicator.classList.remove("mdc-tab-indicator--active");
      });
      tab.classList.add("mdc-tab--active", "mdc-tab-indicator--active");
      const indicator = tab.querySelector(".mdc-tab-indicator");
      if (indicator) indicator.classList.add("mdc-tab-indicator--active");

      const category = tab.textContent.trim();
      if (category === "PTE Academic" || category === "PTE Core") {
        await loadProducts(category);
      }
    });
  });
});

async function loadProducts(category) {
  try {
    const response = await fetch("/api/products");
    const allProducts = await response.json();

    const filteredProducts = allProducts.filter(p => p.category === category && p.isAvailable);

    renderIndividualProducts(filteredProducts.filter(p => p.type === "Individual"));
    renderPackages(filteredProducts.filter(p => p.type === "Package"));
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function renderIndividualProducts(products) {
  const container = document.getElementById("individual-products-container");
  if (!container) return;

  container.innerHTML = products.map(product => `
    <recommended-product class="ng-star-inserted">
        <div class="recommended-product-container">
            <div class="inner-container ng-star-inserted">
                <div class="left-flex-box">
                    <img role="presentation" alt="" src="${product.imageUrl}">
                </div>
                <div class="right-flex-box">
                    <div class="product-info">
                        <div class="product-name-container">
                            <div class="product-name">
                                <p class="product-title">${product.title}</p>
                                <div class="product-description ng-star-inserted">
                                    ${product.description || ""}
                                </div>
                            </div>
                            <div>
                                <quantity-input>
                                    <div class="quantity-input-container">
                                        <form novalidate="" class="ng-untouched ng-pristine ng-valid">
                                            ${product.variants ? `
                                            <select class="variant-dropdown" style="border: 1px solid rgb(145, 145, 145); padding: 8px 12px; width: 100px; height: 48px; border-radius: 4px; margin-bottom: 24px;">
                                                <option value="" disabled selected>Version:</option>
                                                ${product.variants.map(v => `<option value="${v}">${v}</option>`).join("")}
                                            </select>` : ""}
                                            <input id="quantity-input-${product.id}" type="number" value="1" min="1" max="10"
                                                class="mat-mdc-input-element cart-product-input"
                                                style="width: 100px; height: 48px; border: 1px solid #919191; border-radius: 4px; padding: 12px; margin-bottom: 5px;">
                                        </form>
                                    </div>
                                </quantity-input>
                            </div>
                        </div>
                        <div class="product-price-container">
                            <p class="product-price">${product.currency}${product.price.toFixed(2)}</p>
                            <div class="add-button-container ignite-dialog-buttons-container">
                                <button class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-secondary" onclick="addToCart(${product.id})">
                                    <span class="mdc-button__label">Add to cart</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </recommended-product>
  `).join("");
}

function renderPackages(packages) {
  const container = document.getElementById("packages-container");
  if (!container) return;

  container.innerHTML = packages.map(pkg => `
    <div class="bundle-container ng-star-inserted">
        <recommended-bundle>
            <div class="recommended-bundle-container">
                <div class="recommended-bundle-header ng-star-inserted">
                    <div class="image-container">
                        <img src="${pkg.imageUrl}" alt="${pkg.title}" class="ng-star-inserted">
                    </div>
                </div>
                <div class="product-info-container ng-star-inserted">
                    <span class="product-name">${pkg.title}</span>
                    <span>${pkg.currency}${pkg.price.toFixed(2)}</span>
                </div>
                <div class="product-description ng-star-inserted">${pkg.description || ""}</div>
                <div class="add-button-container ignite-dialog-buttons-container ng-star-inserted">
                    <button class="mdc-button mat-mdc-button-base ignite-button mat-mdc-button mat-secondary" onclick="addToCart(${pkg.id})">
                        <span class="mdc-button__label">Add to cart</span>
                    </button>
                </div>
            </div>
        </recommended-bundle>
    </div>
  `).join("");
}

function addToCart(productId) {
  const quantityInput = document.getElementById(`quantity-input-${productId}`);
  const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
  console.log(`Adding product ${productId} to cart with quantity ${quantity}`);
  // Implement actual cart logic here
  alert("Product added to cart (Simulation)");
}
