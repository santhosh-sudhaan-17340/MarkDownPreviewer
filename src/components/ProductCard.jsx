import { Link } from 'react-router-dom'
import './ProductCard.css'

function ProductCard({ product, addToCart }) {
  const handleAddToCart = (e) => {
    e.preventDefault()
    addToCart(product)
  }

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-image">
        <img src={product.image} alt={product.name} />
        {product.discount > 0 && (
          <div className="product-badge">{product.discount}% OFF</div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-weight">{product.weight}</p>
        <div className="product-rating">
          <span className="stars">⭐ {product.rating}</span>
          <span className="reviews">({product.reviews})</span>
        </div>
        <div className="product-pricing">
          <div className="price-container">
            <span className="price">₹{product.price}</span>
            {product.originalPrice > product.price && (
              <span className="original-price">₹{product.originalPrice}</span>
            )}
          </div>
          <button
            className="add-to-cart-btn"
            onClick={handleAddToCart}
          >
            Add
          </button>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
