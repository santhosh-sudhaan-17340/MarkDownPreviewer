import { Link, useNavigate } from 'react-router-dom'
import './Header.css'

function Header({ cartCount, searchQuery, setSearchQuery }) {
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header-top">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <div className="logo-icon">J</div>
              <div className="logo-text">
                <span className="logo-main">JioMart</span>
                <span className="logo-tagline">Your everyday store</span>
              </div>
            </Link>

            <div className="search-bar">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">
                  <span className="search-icon">🔍</span>
                </button>
              </form>
            </div>

            <div className="header-actions">
              <Link to="/cart" className="cart-button">
                <span className="cart-icon">🛒</span>
                <span className="cart-text">Cart</span>
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </Link>
              <button className="user-button">
                <span className="user-icon">👤</span>
                <span className="user-text">Sign In</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
