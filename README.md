# JioMart Clone - E-commerce Application

A fully responsive and functional e-commerce web application inspired by JioMart, built with React and Vite.

## Features

- **Responsive Design**: Fully responsive across all devices (desktop, tablet, mobile)
- **Product Catalog**: Browse 20+ products across multiple categories
- **Category Navigation**: Easy navigation through different product categories
- **Search Functionality**: Search products by name, brand, or category
- **Shopping Cart**: Add, remove, and update product quantities
- **Product Details**: Detailed product information with related products
- **Hero Carousel**: Eye-catching offers carousel on the homepage
- **Deals Section**: Special deals and offers showcase
- **Free Delivery**: Free delivery on orders above ₹500

## Technologies Used

- **React 18**: Frontend framework
- **React Router DOM**: Client-side routing
- **Vite**: Build tool and development server
- **CSS3**: Styling with custom CSS
- **Modern JavaScript (ES6+)**: Latest JavaScript features

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Navigation header with search and cart
│   │   ├── Footer.jsx          # Footer with links and information
│   │   ├── CategoryNav.jsx     # Category navigation bar
│   │   └── ProductCard.jsx     # Product card component
│   ├── pages/
│   │   ├── Home.jsx            # Homepage with carousel and products
│   │   ├── ProductDetail.jsx   # Individual product details page
│   │   ├── Cart.jsx            # Shopping cart page
│   │   └── Category.jsx        # Category-specific products page
│   ├── data/
│   │   └── products.js         # Product data and categories
│   ├── App.jsx                 # Main app component with routing
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd MarkDownPreviewer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

### Build for Production

```bash
npm run build
```

This will create a `dist` folder with optimized production-ready files.

### Preview Production Build

```bash
npm run preview
```

## Features in Detail

### Product Categories

- All Products
- Grocery
- Fruits & Vegetables
- Dairy
- Snacks
- Beverages
- Household
- Personal Care

### Shopping Cart Features

- Add products to cart
- Update product quantities
- Remove products from cart
- Clear entire cart
- Free delivery threshold indicator
- Order summary with total calculation

### Responsive Breakpoints

- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px
- Small Mobile: < 480px

## Key Components

### Header
- Logo and branding
- Search bar with real-time filtering
- Shopping cart with item count badge
- User sign-in button

### Category Navigation
- Horizontal scrollable category menu
- Active category highlighting
- Icon-based category representation

### Product Card
- Product image with discount badge
- Product name, weight, and rating
- Price display with original price strikethrough
- Quick add to cart button

### Product Detail Page
- Large product image
- Comprehensive product information
- Quantity selector
- Add to cart and buy now buttons
- Related products section

### Shopping Cart
- Line item display with images
- Quantity controls
- Remove item functionality
- Order summary sidebar
- Free delivery progress indicator

## Color Scheme

- Primary Blue: `#0078AD`
- Secondary Red: `#FF6B6B`
- Success Green: `#51CF66`
- Background: `#F8F9FA`
- Text Dark: `#1A1A1A`
- Text Light: `#666666`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

- User authentication and profiles
- Wishlist functionality
- Product reviews and ratings
- Order history
- Payment gateway integration
- Advanced filters and sorting
- Product recommendations
- Multi-language support

## License

This is a demo project created for educational purposes.

## Acknowledgments

- Inspired by JioMart
- Images from Unsplash
- Icons represented with emojis for simplicity
