import { useParams, Link, useNavigate } from 'react-router-dom'
import { products } from '../data/products'
import { useState } from 'react'
import './ProductDetail.css'

function ProductDetail({ addToCart }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find(p => p.id === parseInt(id))
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Product not found</h2>
        <Link to="/" className="back-link">← Back to Home</Link>
      </div>
    )
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product)
    }
    navigate('/cart')
  }

  const relatedProducts = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  return (
    <div className="product-detail">
      <div className="container">
        <Link to="/" className="back-link">← Back to Products</Link>

        <div className="product-detail-content">
          <div className="product-detail-image">
            <img src={product.image} alt={product.name} />
          </div>

          <div className="product-detail-info">
            <div className="product-breadcrumb">{product.category}</div>
            <h1>{product.name}</h1>
            <div className="product-brand">Brand: {product.brand}</div>

            <div className="product-rating-large">
              <span className="stars">⭐ {product.rating}</span>
              <span className="reviews">({product.reviews} reviews)</span>
            </div>

            <div className="product-pricing-large">
              <div className="price-info">
                <span className="current-price">₹{product.price}</span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="original-price-large">₹{product.originalPrice}</span>
                    <span className="discount-badge">{product.discount}% OFF</span>
                  </>
                )}
              </div>
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label">Weight:</span>
                <span className="meta-value">{product.weight}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Availability:</span>
                <span className="meta-value in-stock">
                  {product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                </span>
              </div>
            </div>

            <div className="product-description">
              <h3>Product Description</h3>
              <p>{product.description}</p>
            </div>

            <div className="product-actions">
              <div className="quantity-selector">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
              <button className="add-to-cart-btn-large" onClick={handleAddToCart}>
                Add to Cart
              </button>
              <button className="buy-now-btn">Buy Now</button>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="related-products">
            <h2>Related Products</h2>
            <div className="related-grid">
              {relatedProducts.map((relatedProduct) => (
                <Link key={relatedProduct.id} to={`/product/${relatedProduct.id}`} className="related-card">
                  <img src={relatedProduct.image} alt={relatedProduct.name} />
                  <h4>{relatedProduct.name}</h4>
                  <div className="related-price">
                    <span>₹{relatedProduct.price}</span>
                    {relatedProduct.discount > 0 && (
                      <span className="related-discount">{relatedProduct.discount}% OFF</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default ProductDetail
