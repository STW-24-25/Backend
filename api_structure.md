# /api

## Users

### Public

- /users
  - `POST` : Create a new user
  - `PUT` : Edit a user
  - `DELETE` : Delete a user
- /users/login
  - `POST` : Login a user. Returns the token and user data if not blocked, otherwise blocked status.
- /users/:id
  - `GET` : Get a user by id
- /users/request-unblock
  - `POST` : Request unblock for a user

### Admin only

- /users
  - `GET` : Get all users
  - `DELETE` : Delete a user
- /users/block
  - `POST` : Block a user
- /users/unblock
  - `POST` : Unblock a user
- /users/promote
  - `POST` : Promote a user to admin

## Forums

### Public

- /forums
  - `GET` : Get all forums
- /forums/:id
  - `GET` : Get a forum by id

### Admin only

- /forums
  - `POST` : Create a new forum
  - `PUT` : Edit a forum
  - `DELETE` : Delete a forum

## Posts

### Public

- /posts/:id
  - `GET` : Get all posts in a forum
- /posts
  - `POST` : Create a new post in a forum
  - `PUT` : Edit a post
  - `DELETE` : Delete a post (also admin)

Comments are considered as posts, and saved in an array of child posts in the parent post.

### Admin only

- /posts
  - `GET` : Get all posts

## Products

### Public

- /products
  - `GET` : Get all products (name and last price)
- /products/:id
  - `GET` : Get a product by id (name and all (?) prices)
- Add product description and image?

## Admin

- /admin/stats
  - `GET` : Get statistics about the app:
    - Number of total users registered.
    - Number of total users created per month.
    - Number of total users blocked.
    - Number of total posts.
    - Number of total posts created per month.
    - Number of total forums.
    - Number of total users per autonomous community
    - Number of users per role.
    - Number of logins per month and hour.

## Parcels

### Public

- /api/parcels
  - `POST` : Create a new parcel
  - `GET` : Get all parcels
- /api/parcels/:id
  - `GET` : Get a specific parcel by id

### Admin only

- /api/parcels/:id
  - `PUT` : Update a specific parcel by id
  - `DELETE` : Delete a specific parcel by id
