const prisma = require("../lib/prisma");
const { sendJson, parseJsonBody } = require("../lib/http");

async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "asc" },
    });
    sendJson(res, 200, products);
  } catch (error) {
    console.error("Error fetching products:", error);
    sendJson(res, 500, { error: "Failed to fetch products." });
  }
}

async function createProduct(req, res) {
  try {
    const body = await parseJsonBody(req);
    const product = await prisma.product.create({
      data: {
        title: body.title,
        category: body.category,
        type: body.type,
        description: body.description,
        price: parseFloat(body.price),
        currency: body.currency || "AU$",
        imageUrl: body.imageUrl,
        variants: body.variants || null,
        isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
      },
    });
    sendJson(res, 201, product);
  } catch (error) {
    console.error("Error creating product:", error);
    sendJson(res, 500, { error: "Failed to create product." });
  }
}

async function updateProduct(req, res, id) {
  try {
    const body = await parseJsonBody(req);
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        title: body.title,
        category: body.category,
        type: body.type,
        description: body.description,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        currency: body.currency,
        imageUrl: body.imageUrl,
        variants: body.variants,
        isAvailable: body.isAvailable,
      },
    });
    sendJson(res, 200, product);
  } catch (error) {
    console.error("Error updating product:", error);
    sendJson(res, 500, { error: "Failed to update product." });
  }
}

async function deleteProduct(req, res, id) {
  try {
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    sendJson(res, 500, { error: "Failed to delete product." });
  }
}

async function seedProducts() {
  const count = await prisma.product.count();
  if (count > 0) return;

  const products = [
    // PTE Academic Individual Products
    {
      title: "PTE Expert – Self Study Guide B2",
      category: "PTE Academic",
      type: "Individual",
      description: "Target 59-75 with this 170+ page eBook which includes online test practice.",
      price: 80.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/145/images/417/A103000356132_Std__22309.1758866959.386.513__c_1.jpg",
    },
    {
      title: "PTE Expert – Self Study Guide B1",
      category: "PTE Academic",
      type: "Individual",
      description: "Target 43-59 with this 170+ page eBook which includes online test practice.",
      price: 80.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/144/images/416/A103000356132_Std__08406.1758866958.386.513__c_1.jpg",
    },
    {
      title: "Scored Practice Test",
      category: "PTE Academic",
      type: "Individual",
      description: "Just like the real test, with a complete score report. The best way to check you are ready for PTE Academic.",
      price: 59.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/137/images/407/A103000356113_Std__44175.1752120318.386.513__c_1.jpg",
      variants: ["Version 1", "Version 2", "Version 3", "Version 4"],
    },
    {
      title: "The Official Guide to PTE Academic 3e",
      category: "PTE Academic",
      type: "Individual",
      description: "Tips from experts and lots of extra digital practice resources in a convenient eBook.",
      price: 33.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/142/images/412/A103000356132_Std__46948.1752120324.386.513__c_1.jpg",
    },
    {
      title: "PTE Academic Question Bank",
      category: "PTE Academic",
      type: "Individual",
      description: "300 practice questions with model answers, plus samples for speaking and writing.",
      price: 33.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/126/images/392/1732090791.386.513__c_1.jpg",
    },
    // PTE Academic Packages
    {
      title: "Premium Plus B2",
      category: "PTE Academic",
      type: "Package",
      description: "3 Scored Practice Tests · PTE Academic Question Bank (340 questions) · PTE Expert – Self Study Guide B2 · Official Guide to PTE Academic",
      price: 177.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/147/images/419/A103000356119_Std__63954.1758866961.386.513__c_1.jpg",
    },
    {
      title: "Premium Plus B1",
      category: "PTE Academic",
      type: "Package",
      description: "3 Scored Practice Tests · PTE Academic Question Bank (340 questions) · PTE Expert – Self Study Guide B1 · Official Guide to PTE Academic",
      price: 177.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/146/images/418/A103000356119_Std__87535.1758866960.386.513__c_1.jpg",
    },
    {
      title: "Premium Package",
      category: "PTE Academic",
      type: "Package",
      description: "3 Scored Practice Tests · PTE Academic Question Bank (340 questions) · Official Guide to PTE Academic",
      price: 129.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/141/images/411/A103000356119_Std__77836.1752120322.386.513__c_1.jpg",
    },
    {
      title: "Essential Package",
      category: "PTE Academic",
      type: "Package",
      description: "2 Scored Practice Tests · PTE Academic Question Bank (340 questions)",
      price: 94.99,
      imageUrl: "/assets/cdn11.bigcommerce.com/s-kymzzd0jes/products/140/images/410/A103000356119_Std__16697.1752120322.386.513__c_1.jpg",
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }
  console.log("Products seeded successfully.");
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  seedProducts,
};
