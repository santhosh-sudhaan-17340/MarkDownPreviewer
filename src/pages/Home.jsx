import { useState } from 'react'
import CategoryNav from '../components/CategoryNav'
import ProductCard from '../components/ProductCard'
import { products, offers } from '../data/products'
import './Home.css'

function Home({ addToCart, searchQuery }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % offers.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + offers.length) % offers.length)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="home">
      <CategoryNav activeCategory="All" />

      <div className="container">
        <div className="hero-carousel">
          <button className="carousel-btn prev" onClick={prevSlide}>‹</button>
          <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {offers.map((offer) => (
              <div key={offer.id} className="carousel-slide" style={{ backgroundColor: offer.bgColor }}>
                <div className="slide-content">
                  <h2>{offer.title}</h2>
                  <p>{offer.subtitle}</p>
                  <button className="shop-now-btn">Shop Now</button>
                </div>
                <div className="slide-image">
                  <img src={offer.image} alt={offer.title} />
                </div>
              </div>
            ))}
          </div>
          <button className="carousel-btn next" onClick={nextSlide}>›</button>
          <div className="carousel-dots">
            {offers.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>

        <section className="deals-section">
          <h2>Top Deals</h2>
          <div className="deals-grid">
            <div className="deal-card" style={{ backgroundColor: '#FFF3E0' }}>
              <h3>Fruits & Vegetables</h3>
              <p className="deal-text">Up to 30% OFF</p>
              <img src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300&h=200&fit=crop" alt="Fruits" />
            </div>
            <div className="deal-card" style={{ backgroundColor: '#E3F2FD' }}>
              <h3>Daily Essentials</h3>
              <p className="deal-text">Starting at ₹10</p>
              <img src="https://images.unsplash.com/photo-1584949091598-c31daaaa4aa9?w=300&h=200&fit=crop" alt="Essentials" />
            </div>
            <div className="deal-card" style={{ backgroundColor: '#F3E5F5' }}>
              <h3>Beverages</h3>
              <p className="deal-text">Buy 2 Get 1 Free</p>
              <img src="https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop" alt="Beverages" />
            </div>
            <div className="deal-card" style={{ backgroundColor: '#E8F5E9' }}>
              <h3>Personal Care</h3>
              <p className="deal-text">Mega Savings</p>
              <img src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&h=200&fit=crop" alt="Personal Care" />
            </div>
          </div>
        </section>

        <section className="products-section">
          <h2>{searchQuery ? `Search results for "${searchQuery}"` : 'All Products'}</h2>
          {filteredProducts.length === 0 ? (
            <div className="no-products">
              <p>No products found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  addToCart={addToCart}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Home
