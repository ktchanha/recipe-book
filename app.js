
import {
    getRecipes,
    getRecipeById,
    searchRecipes,
    getRecipeTags,
    getRecipesByTag,
    addRecipe,
    updateRecipe,
    deleteRecipe
} from "./api.js";

const RECIPES_PER_PAGE = 12;
const FALLBACK_IMAGE = "https://cdn.dummyjson.com/recipe-images/1.webp";

const recipeList = document.querySelector("#recipe-list");
const searchInput = document.querySelector("#search-input");
const categoryFilter = document.querySelector("#category-filter");
const sortSelect = document.querySelector("#sort-select");
const pagination = document.querySelector("#pagination");
const resultsCount = document.querySelector("#results-count");
const statusArea = document.querySelector("#status-area");

const homeView = document.querySelector("#home-view");
const detailView = document.querySelector("#detail-view");
const addView = document.querySelector("#add-view");
const hero = document.querySelector("#hero");

const homeBtn = document.querySelector("#home-btn");
const favoritesBtn = document.querySelector("#favorites-btn");
const addRecipeBtn = document.querySelector("#add-recipe-btn");
const homeLogo = document.querySelector("#home-logo");
const favoriteCount = document.querySelector("#favorite-count");

const recipeForm = document.querySelector("#recipe-form");
const formMessage = document.querySelector("#form-message");
const cancelFormBtn = document.querySelector("#cancel-form-btn");
const formTitle = document.querySelector("#form-title");

let allRecipes = [];
let favoriteRecipes = loadFavorites();
let currentPage = 1;
let currentView = "home";
let selectedRecipe = null;
let editingRecipeId = null;
let isLoading = false;
let requestNumber = 0;

function loadFavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem("favorites", JSON.stringify(favoriteRecipes));
    } catch {
        showStatus("Favorites could not be saved in this browser.", true);
    }

    updateFavoriteCount();
}

function updateFavoriteCount() {
    favoriteCount.textContent = favoriteRecipes.length;
}

function isFavorite(id) {
    return favoriteRecipes.some(recipe => String(recipe.id) === String(id));
}

function showStatus(message, isError = false, canRetry = false) {
    statusArea.replaceChildren();

    const paragraph = document.createElement("p");
    paragraph.className = `status-message${isError ? " error" : ""}`;
    paragraph.textContent = message;
    statusArea.appendChild(paragraph);

    if (canRetry) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary-btn retry-btn";
        button.textContent = "Try again";
        button.addEventListener("click", () => loadRecipes());
        statusArea.appendChild(button);
    }
}

function clearStatus() {
    statusArea.replaceChildren();
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function populateCategories(tags) {
    categoryFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All categories";
    categoryFilter.appendChild(allOption);

    tags.forEach(tag => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
        categoryFilter.appendChild(option);
    });
}

async function loadRecipes() {
    const thisRequest = ++requestNumber;
    isLoading = true;
    recipeList.replaceChildren();
    pagination.replaceChildren();
    showStatus("Loading recipes...");

    try {
        const [data, tags] = await Promise.all([
            getRecipes(0, 0),
            getRecipeTags()
        ]);

        if (thisRequest !== requestNumber) return;

        if (!Array.isArray(data.recipes) || !Array.isArray(tags)) {
            throw new Error("The server returned invalid recipe data.");
        }

        allRecipes = data.recipes;
        populateCategories(tags);
        clearStatus();

        if (currentView === "home" || currentView === "favorites") {
            await renderCurrentView();
        }
    } catch {
        if (thisRequest === requestNumber) {
            recipeList.replaceChildren();
            showStatus(
                "We couldn't load recipes. Check your internet connection and try again.",
                true,
                true
            );
        }
    } finally {
        if (thisRequest === requestNumber) isLoading = false;
    }
}

function getSortOptions() {
    if (sortSelect.value === "name-asc") {
        return { sortBy: "name", order: "asc" };
    }

    if (sortSelect.value === "rating-desc") {
        return { sortBy: "rating", order: "desc" };
    }

    return {};
}

async function getCurrentPageData() {
    const query = searchInput.value.trim();
    const category = categoryFilter.value;
    const { sortBy, order } = getSortOptions();

    if (currentView === "favorites") {
        let recipes = [...favoriteRecipes];

        if (query) {
            recipes = recipes.filter(recipe =>
                recipe.name.toLowerCase().includes(query.toLowerCase())
            );
        }

        if (category !== "all") {
            recipes = recipes.filter(recipe =>
                (recipe.tags || []).includes(category)
            );
        }

        if (sortBy === "name") {
            recipes.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === "rating") {
            recipes.sort((a, b) => b.rating - a.rating);
        }

        const start = (currentPage - 1) * RECIPES_PER_PAGE;

        return {
            recipes: recipes.slice(start, start + RECIPES_PER_PAGE),
            total: recipes.length
        };
    }

    if (query) {
        return searchRecipes(
            query, RECIPES_PER_PAGE,
            (currentPage - 1) * RECIPES_PER_PAGE, sortBy, order
        );
    }

    if (category !== "all") {
        return getRecipesByTag(
            category, RECIPES_PER_PAGE,
            (currentPage - 1) * RECIPES_PER_PAGE, sortBy, order
        );
    }

    return getRecipes(
        RECIPES_PER_PAGE,
        (currentPage - 1) * RECIPES_PER_PAGE,
        sortBy,
        order
    );
}

async function renderCurrentView() {
    if (currentView !== "home" && currentView !== "favorites") return;

    const thisRequest = ++requestNumber;
    isLoading = true;
    recipeList.replaceChildren();
    pagination.replaceChildren();
    showStatus("Loading recipes...");

    try {
        const data = await getCurrentPageData();

        if (thisRequest !== requestNumber) return;

        if (!Array.isArray(data.recipes)) {
            throw new Error("Invalid recipe list.");
        }

        const recipes = data.recipes;
        const total = Number(data.total) || 0;
        const totalPages = Math.max(1, Math.ceil(total / RECIPES_PER_PAGE));

        if (currentPage > totalPages) {
            currentPage = totalPages;
            return await renderCurrentView();
        }

        clearStatus();

        document.querySelector("#collection-title").textContent =
            currentView === "favorites" ? "Your Favorites" : "Popular Recipes";

        resultsCount.textContent = `${total} recipe${total === 1 ? "" : "s"}`;

        if (recipes.length === 0) {
            showStatus(
                currentView === "favorites"
                    ? "You haven't saved any favorites yet."
                    : "No recipes match your search. Try another keyword or category."
            );
            return;
        }

        recipes.forEach(recipe => {
            recipeList.appendChild(createRecipeCard(recipe));
        });

        renderPagination(totalPages);
    } catch {
        if (thisRequest === requestNumber) {
            showStatus(
                "We couldn't load these recipes. Please try again.",
                true,
                true
            );
        }
    } finally {
        if (thisRequest === requestNumber) isLoading = false;
    }
}

function createRecipeCard(recipe) {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const image = document.createElement("img");
    image.className = "recipe-image";
    image.src = recipe.image || FALLBACK_IMAGE;
    image.alt = recipe.name;
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.src = FALLBACK_IMAGE;
        image.addEventListener("error", () => {
            image.style.display = "none";
        }, { once: true });
    }, { once: true });

    const content = document.createElement("div");
    content.className = "recipe-content";

    const title = document.createElement("h3");
    title.textContent = recipe.name;

    const description = document.createElement("p");
    description.className = "recipe-description";
    description.textContent = recipe.description || `${recipe.cuisine || "Delicious"} recipe.`;

    const meta = document.createElement("div");
    meta.className = "recipe-meta";

    const rating = document.createElement("span");
    rating.textContent = `⭐ ${Number(recipe.rating || 0).toFixed(1)}`;

    const totalTime = document.createElement("span");
    totalTime.textContent =
        `⏱ ${(Number(recipe.prepTimeMinutes) || 0) + (Number(recipe.cookTimeMinutes) || 0)} min`;

    const cuisine = document.createElement("span");
    cuisine.textContent = recipe.cuisine || "Cuisine not specified";

    const actions = document.createElement("div");
    actions.className = "recipe-actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "primary-btn";
    detailsBtn.textContent = "View recipe";
    detailsBtn.addEventListener("click", () => showRecipeDetails(recipe));

    const favoriteBtn = document.createElement("button");
    favoriteBtn.type = "button";
    favoriteBtn.className = "favorite-btn";
    favoriteBtn.textContent = isFavorite(recipe.id) ? "♥ Saved" : "♡ Favorite";

    if (isFavorite(recipe.id)) favoriteBtn.classList.add("is-favorite");

    favoriteBtn.addEventListener("click", () => toggleFavorite(recipe));

    meta.append(rating, totalTime, cuisine);
    actions.append(detailsBtn, favoriteBtn);
    content.append(title, description, meta, actions);
    card.append(image, content);

    return card;
}

function renderPagination(totalPages) {
    pagination.replaceChildren();

    if (totalPages <= 1) return;

    const previous = createPageButton("Previous", currentPage - 1);
    previous.disabled = currentPage === 1;
    pagination.appendChild(previous);

    const pageInfo = document.createElement("span");
    pageInfo.className = "page-btn";
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    pagination.appendChild(pageInfo);

    const next = createPageButton("Next", currentPage + 1);
    next.disabled = currentPage === totalPages;
    pagination.appendChild(next);
}

function createPageButton(label, page) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-btn";
    button.textContent = label;

    button.addEventListener("click", async () => {
        currentPage = page;
        await renderCurrentView();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return button;
}

function toggleFavorite(recipe) {
    if (isFavorite(recipe.id)) {
        favoriteRecipes = favoriteRecipes.filter(
            favorite => String(favorite.id) !== String(recipe.id)
        );
    } else {
        favoriteRecipes.push(recipe);
    }

    saveFavorites();

    if (currentView === "detail" && selectedRecipe) {
        showRecipeDetails(selectedRecipe);
    } else {
        renderCurrentView();
    }
}

async function showRecipeDetails(recipe) {
    currentView = "detail";
    selectedRecipe = recipe;
    homeView.classList.add("hidden");
    detailView.classList.remove("hidden");
    addView.classList.add("hidden");
    hero.classList.add("hidden");
    clearStatus();
    detailView.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "status-message";
    loading.textContent = "Loading recipe details...";
    detailView.appendChild(loading);

    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
        let fullRecipe;

        if (String(recipe.id).startsWith("local-")) {
            fullRecipe = recipe;
        } else {
            fullRecipe = await getRecipeById(recipe.id);
        }

        if (currentView !== "detail" || selectedRecipe !== recipe) return;

        selectedRecipe = fullRecipe;

        const ingredients = fullRecipe.ingredients || [];
        const instructions = fullRecipe.instructions || [];
        const mealTypes = fullRecipe.mealType || [];
        const tags = fullRecipe.tags || [];

        detailView.innerHTML = `
            <div class="detail-panel">
                <button type="button" class="detail-back-btn" id="back-to-list">
                    ← Back to recipes
                </button>
                <div class="detail-layout">
                    <div>
                        <img class="detail-image"
                             src="${escapeHTML(fullRecipe.image || FALLBACK_IMAGE)}"
                             alt="${escapeHTML(fullRecipe.name)}">
                    </div>
                    <div class="detail-info">
                        <p class="eyebrow">${escapeHTML(fullRecipe.cuisine || "RECIPE")}</p>
                        <h2>${escapeHTML(fullRecipe.name)}</h2>
                        <p>${escapeHTML(fullRecipe.description || "")}</p>
                        <p>⭐ ${Number(fullRecipe.rating || 0).toFixed(1)} / 5</p>
                        <p>Preparation: ${Number(fullRecipe.prepTimeMinutes) || 0} minutes</p>
                        <p>Cooking: ${Number(fullRecipe.cookTimeMinutes) || 0} minutes</p>
                        <p>Servings: ${Number(fullRecipe.servings) || 1}</p>
                        <p>Meal type: ${mealTypes.map(escapeHTML).join(", ") || "Not specified"}</p>

                        <div class="detail-actions">
                            <button type="button" id="detail-favorite-btn" class="favorite-btn">
                                ${isFavorite(fullRecipe.id) ? "♥ Remove from Favorites" : "♡ Add to Favorites"}
                            </button>
                            <button type="button" id="edit-recipe-btn" class="secondary-btn">
                                Edit recipe
                            </button>
                            <button type="button" id="delete-recipe-btn" class="danger-btn">
                                Delete recipe
                            </button>
                        </div>

                        <h3>Ingredients</h3>
                        <ul>${ingredients.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>

                        <h3>Instructions</h3>
                        <ol>${instructions.map(step => `<li>${escapeHTML(step)}</li>`).join("")}</ol>

                        <p>Tags: ${tags.map(escapeHTML).join(", ") || "None"}</p>
                        <p id="detail-message" class="form-message" aria-live="polite"></p>
                    </div>
                </div>
            </div>
        `;

        detailView.querySelector("#back-to-list").addEventListener("click", () => {
            showView("home");
        });

        detailView.querySelector("#detail-favorite-btn").addEventListener("click", () => {
            toggleFavorite(fullRecipe);
        });

        detailView.querySelector("#edit-recipe-btn").addEventListener("click", () => {
            openEditForm(fullRecipe);
        });

        detailView.querySelector("#delete-recipe-btn").addEventListener("click", async event => {
            const button = event.currentTarget;
            button.disabled = true;

            try {
                if (!String(fullRecipe.id).startsWith("local-")) {
                    await deleteRecipe(fullRecipe.id);
                }

                allRecipes = allRecipes.filter(
                    item => String(item.id) !== String(fullRecipe.id)
                );

                favoriteRecipes = favoriteRecipes.filter(
                    item => String(item.id) !== String(fullRecipe.id)
                );

                saveFavorites();
                showView("home");
                await renderCurrentView();
            } catch (error) {
                const message = detailView.querySelector("#detail-message");
                if (message) message.textContent = error.message;
                button.disabled = false;
            }
        });

        const detailImage = detailView.querySelector(".detail-image");
        detailImage.addEventListener("error", () => {
            detailImage.style.display = "none";
        }, { once: true });
    } catch {
        detailView.innerHTML = `
            <div class="detail-panel">
                <p class="status-message error">
                    We couldn't load this recipe. Please try again.
                </p>
                <button type="button" class="primary-btn" id="retry-detail-btn">Try again</button>
                <button type="button" class="secondary-btn" id="back-to-list">Back to recipes</button>
            </div>
        `;

        detailView.querySelector("#retry-detail-btn").addEventListener("click", () => {
            showRecipeDetails(recipe);
        });

        detailView.querySelector("#back-to-list").addEventListener("click", () => {
            showView("home");
        });
    }
}

function showView(view) {
    currentView = view;
    selectedRecipe = null;

    homeView.classList.toggle("hidden", view !== "home" && view !== "favorites");
    detailView.classList.add("hidden");
    addView.classList.toggle("hidden", view !== "add");
    hero.classList.toggle("hidden", view !== "home");

    homeBtn.classList.toggle("active", view === "home");
    favoritesBtn.classList.toggle("active", view === "favorites");
    addRecipeBtn.classList.toggle("active", view === "add");

    if (view === "home" || view === "favorites") {
        currentPage = 1;
        renderCurrentView();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearFieldErrors() {
    recipeForm.querySelectorAll(".field-error").forEach(element => {
        element.textContent = "";
    });

    recipeForm.querySelectorAll(".field-invalid").forEach(element => {
        element.classList.remove("field-invalid");
    });
}

function setFieldError(fieldName, message) {
    const input = recipeForm.elements.namedItem(fieldName);
    const error = recipeForm.querySelector(`[data-error="${fieldName}"]`);

    if (input) input.classList.add("field-invalid");
    if (error) error.textContent = message;
}

function validateRecipeForm(data) {
    clearFieldErrors();
    let valid = true;

    const requiredTextFields = ["name", "cuisine", "description", "ingredients", "instructions"];

    requiredTextFields.forEach(name => {
        if (!String(data[name] || "").trim()) {
            setFieldError(name, "This field is required.");
            valid = false;
        }
    });

    if (String(data.name).trim().length < 2) {
        setFieldError("name", "Enter at least 2 characters.");
        valid = false;
    }

    if (String(data.description).trim().length < 5) {
        setFieldError("description", "Enter at least 5 characters.");
        valid = false;
    }

    if (!data.mealType) {
        setFieldError("mealType", "Choose a meal type.");
        valid = false;
    }

    ["prepTimeMinutes", "cookTimeMinutes"].forEach(name => {
        if (!Number.isFinite(data[name]) || data[name] < 0 || data[name] > 1440) {
            setFieldError(name, "Enter a value from 0 to 1440.");
            valid = false;
        }
    });

    if (!Number.isFinite(data.rating) || data.rating < 0 || data.rating > 5) {
        setFieldError("rating", "Rating must be between 0 and 5.");
        valid = false;
    }

    if (!Number.isInteger(data.servings) || data.servings < 1 || data.servings > 100) {
        setFieldError("servings", "Servings must be between 1 and 100.");
        valid = false;
    }

    if (data.image) {
        try {
            const imageURL = new URL(data.image);
            if (imageURL.protocol !== "http:" && imageURL.protocol !== "https:") {
                throw new Error("Invalid image URL");
            }
        } catch {
            setFieldError("image", "Enter a valid http or https image URL.");
            valid = false;
        }
    }

    return valid;
}

function readFormData() {
    const formData = new FormData(recipeForm);

    return {
        name: String(formData.get("name") || "").trim(),
        cuisine: String(formData.get("cuisine") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        image: String(formData.get("image") || "").trim() || FALLBACK_IMAGE,
        mealType: [String(formData.get("mealType") || "")],
        prepTimeMinutes: Number(formData.get("prepTimeMinutes")),
        cookTimeMinutes: Number(formData.get("cookTimeMinutes")),
        rating: Number(formData.get("rating")),
        servings: Number(formData.get("servings")),
        tags: String(formData.get("tags") || "")
            .split(",").map(tag => tag.trim()).filter(Boolean),
        ingredients: String(formData.get("ingredients") || "")
            .split("\n").map(item => item.trim()).filter(Boolean),
        instructions: String(formData.get("instructions") || "")
            .split("\n").map(item => item.trim()).filter(Boolean)
    };
}

function openEditForm(recipe) {
    editingRecipeId = recipe.id;
    showView("add");
    formTitle.textContent = "Edit Recipe";

    recipeForm.elements.namedItem("name").value = recipe.name || "";
    recipeForm.elements.namedItem("cuisine").value = recipe.cuisine || "";
    recipeForm.elements.namedItem("image").value = recipe.image || "";
    recipeForm.elements.namedItem("mealType").value = (recipe.mealType || [])[0] || "";
    recipeForm.elements.namedItem("prepTimeMinutes").value = recipe.prepTimeMinutes ?? 0;
    recipeForm.elements.namedItem("cookTimeMinutes").value = recipe.cookTimeMinutes ?? 0;
    recipeForm.elements.namedItem("rating").value = recipe.rating ?? 0;
    recipeForm.elements.namedItem("servings").value = recipe.servings ?? 2;
    recipeForm.elements.namedItem("tags").value = (recipe.tags || []).join(", ");
    recipeForm.elements.namedItem("description").value = recipe.description || "";
    recipeForm.elements.namedItem("ingredients").value = (recipe.ingredients || []).join("\n");
    recipeForm.elements.namedItem("instructions").value = (recipe.instructions || []).join("\n");

    formMessage.textContent = "";
    clearFieldErrors();
}

async function handleRecipeSubmit(event) {
    event.preventDefault();

    const recipe = readFormData();

    if (!validateRecipeForm(recipe)) {
        formMessage.textContent = "Please correct the highlighted fields.";
        formMessage.classList.add("error");
        return;
    }

    const submitButton = recipeForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = editingRecipeId ? "Updating..." : "Saving...";
    formMessage.classList.remove("error");
    formMessage.textContent = "";

    try {
        if (editingRecipeId !== null) {
            let updatedRecipe;

            if (String(editingRecipeId).startsWith("local-")) {
                updatedRecipe = { ...recipe, id: editingRecipeId };
            } else {
                const responseRecipe = await updateRecipe(editingRecipeId, recipe);
                updatedRecipe = { ...recipe, ...responseRecipe, id: editingRecipeId };
            }

            allRecipes = allRecipes.map(item =>
                String(item.id) === String(editingRecipeId) ? updatedRecipe : item
            );

            favoriteRecipes = favoriteRecipes.map(item =>
                String(item.id) === String(editingRecipeId) ? updatedRecipe : item
            );

            saveFavorites();
        } else {
            const responseRecipe = await addRecipe(recipe);
            const newRecipe = {
                ...recipe,
                ...responseRecipe,
                id: `local-${Date.now()}`
            };

            allRecipes.unshift(newRecipe);
        }

        recipeForm.reset();
        clearFieldErrors();
        editingRecipeId = null;
        formTitle.textContent = "Add a Recipe";
        formMessage.textContent = "Recipe saved for this session.";
        showView("home");
    } catch (error) {
        formMessage.textContent = error.message || "Could not save the recipe. Please try again.";
        formMessage.classList.add("error");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Save Recipe";
    }
}

searchInput.addEventListener("input", () => {
    currentPage = 1;
    if (currentView === "detail" || currentView === "add") {
        showView("home");
    } else {
        renderCurrentView();
    }
});

categoryFilter.addEventListener("change", () => {
    currentPage = 1;
    renderCurrentView();
});

sortSelect.addEventListener("change", () => {
    currentPage = 1;
    renderCurrentView();
});

homeBtn.addEventListener("click", () => showView("home"));

homeLogo.addEventListener("click", event => {
    event.preventDefault();
    searchInput.value = "";
    categoryFilter.value = "all";
    sortSelect.value = "default";
    showView("home");
});

favoritesBtn.addEventListener("click", () => showView("favorites"));

addRecipeBtn.addEventListener("click", () => {
    editingRecipeId = null;
    recipeForm.reset();
    clearFieldErrors();
    formTitle.textContent = "Add a Recipe";
    formMessage.textContent = "";
    formMessage.classList.remove("error");
    showView("add");
});

cancelFormBtn.addEventListener("click", () => {
    editingRecipeId = null;
    recipeForm.reset();
    clearFieldErrors();
    formTitle.textContent = "Add a Recipe";
    showView("home");
});

recipeForm.addEventListener("submit", handleRecipeSubmit);

updateFavoriteCount();
loadRecipes();
