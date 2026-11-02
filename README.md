# StudioSpace

**Live Site:** https://your-studiospace-live-url.vercel.app
**Client Repo:** https://github.com/your-username/studiospace-client
**Server Repo:** https://github.com/your-username/studiospace-server

StudioSpace is a peer-to-peer marketplace for creators, filmmakers, photographers, podcasters, and musicians. Studio owners list their creative spaces, from photography cyc walls and sound stages to podcast lounges and recording suites, and creators discover, filter, and book them with transparent pricing and real-time booking management.

---

## Key Features

- **Dynamic Home Page:** a Swiper hero slider with three slides, six featured studios fetched from MongoDB, category cards that open `/studios` with the category pre-selected, a "How Booking Works" section, and a Host Guarantee section.
- **Explore and Filter Studios:** a grid of all studios with category, price range, and sort filters, plus friendly empty states when no results match.
- **Full Studio CRUD:** add, view, update, and delete studio listings through private routes, with image upload, amenity tags, and confirmation modals before deletion.
- **Booking System:** reserve studio slots with a status flow of Pending, Confirmed, Completed, and Cancelled, and cancel pending bookings from My Bookings.
- **Double-Booking Prevention:** the server checks time overlap against existing Confirmed bookings and rejects collisions with a clear error message.
- **Secure Authentication:** BetterAuth with email/password and Google login, JWT stored in HTTPOnly cookies, and protected server mutations that return `401 Unauthorized` when unauthenticated.
- **Light and Dark Theme:** a toggle that switches the whole interface between themes.
- **Modern Feedback UI:** toast notifications for all auth, CRUD, and booking actions, custom modal dialogs, and branded skeleton loaders.
- **Responsive Design:** works across mobile, tablet, and desktop, with a custom 404 page.
- **Optional extras:** PDF booking invoice for confirmed bookings and a saved-studios wishlist.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router), Tailwind CSS, DaisyUI / HeroUI / Shadcn UI, TypeScript / JavaScript |
| Authentication | BetterAuth, MongoDB Adapter, JWT (HTTPOnly cookies) |
| Backend | Express.js, Node.js |
| Database | MongoDB |
| Other | Swiper.js, Sonner / React Hot Toast, imgbb (image upload) |
| Deployment | Vercel (client), Render / Vercel (server) |

---

## Routes

| Route | Access | Description |
| --- | --- | --- |
| `/` | Public | Home page |
| `/studios` | Public | Explore all studios |
| `/studios/[id]` | Public | Studio details and booking modal |
| `/login`, `/register` | Public | Authentication |
| `/add-studio` | Private | Add a new studio |
| `/my-listings` | Private | Manage your own listings |
| `/studios/edit/[id]` | Private | Update a studio |
| `/my-bookings` | Private | View and cancel bookings |

---

## Local Setup

### 1. Clone both repositories

```bash
git clone https://github.com/your-username/studiospace-client.git
git clone https://github.com/your-username/studiospace-server.git
```

### 2. Run the server

```bash
cd studiospace-server
npm install
```

Create a `.env` file:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:3000
```

Start the server:

```bash
npm run dev
```

### 3. Run the client

```bash
cd studiospace-client
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
MONGODB_URI=your_mongodb_connection_string
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_IMGBB_KEY=your_imgbb_api_key
```

Start the client:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Examiner Test Credentials

| Role | Email | Password |
| --- | --- | --- |
| Examiner | examiner@studiospace.com | Examiner123 |

> Replace these with a real account you have created on the live site.

---

## Project Structure

```
studiospace-client/   Next.js frontend (App Router)
studiospace-server/   Express.js REST API with MongoDB
```

---

## Author

Assignment B14-A8-Cat_Harry, StudioSpace.
