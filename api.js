
const API_URL = "https://dummyjson.com/recipes";

async function request(url, options = {}) {
    const response = await fetch(url, options);

    if (!response.ok) {
        throw new Error(`Request failed (${response.status}). Please try again.`);
    }

    return response.json();
}

export async function getRecipes(limit = 12, skip = 0, sortBy, order) {
    const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip)
    });

    if (sortBy && order) {
        params.set("sortBy", sortBy);
        params.set("order", order);
    }

    return request(`${API_URL}?${params}`);
}

export async function getRecipeById(id) {
    return request(`${API_URL}/${encodeURIComponent(id)}`);
}

export async function searchRecipes(query, limit = 12, skip = 0, sortBy, order) {
    const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        skip: String(skip)
    });

    if (sortBy && order) {
        params.set("sortBy", sortBy);
        params.set("order", order);
    }

    return request(`${API_URL}/search?${params}`);
}

export async function getRecipeTags() {
    return request(`${API_URL}/tags`);
}

export async function getRecipesByTag(tag, limit = 12, skip = 0, sortBy, order) {
    const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip)
    });

    if (sortBy && order) {
        params.set("sortBy", sortBy);
        params.set("order", order);
    }

    return request(`${API_URL}/tag/${encodeURIComponent(tag)}?${params}`);
}

export async function addRecipe(recipe) {
    return request(`${API_URL}/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe)
    });
}

export async function updateRecipe(id, changes) {
    return request(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes)
    });
}

export async function deleteRecipe(id) {
    return request(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
}
