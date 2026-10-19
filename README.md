# recipe-book
A recipe book web application built with vanilla JavaScript
## About the Project

Recipe Book is a web application that allows users to explore recipes, search for dishes, filter recipes by category, and save their favorite recipes.
## Features

- Fetches recipe data from the DummyJSON API
- Displays recipes in a card layout
- Allows users to search for recipes
- Filters recipes by category
- Allows users to save and view favorite recipes

## API

This project uses the [DummyJSON Recipes API](https://dummyjson.com/recipes) to retrieve and manage recipe data.

The API module includes the following endpoints:

- `GET /recipes` — Retrieves a list of recipes with pagination and optional sorting.
- `GET /recipes/:id` — Retrieves a recipe by its ID.
- `GET /recipes/search?q={query}` — Searches recipes by a query.
- `GET /recipes/tags` — Retrieves available recipe tags.
- `GET /recipes/tag/:tag` — Retrieves recipes filtered by tag.
- `POST /recipes/add` — Sends a request to add a recipe.
- `PUT /recipes/:id` — Sends a request to update a recipe.
- `DELETE /recipes/:id` — Sends a request to delete a recipe.

The API requests are handled in `api.js` using the Fetch API.