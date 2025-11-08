import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>JioMart</h3>
            <p>Your everyday online shopping destination for groceries and essentials.</p>
            <div className="social-links">
              <a href="#" aria-label="Facebook">📘</a>
              <a href="#" aria-label="Twitter">🐦</a>
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="YouTube">📺</a>
            </div>
          </div>

          <div className="footer-section">
            <h4>Shop By Category</h4>
            <ul>
              <li><a href="#">Grocery & Staples</a></li>
              <li><a href="#">Fruits & Vegetables</a></li>
              <li><a href="#">Dairy & Bakery</a></li>
              <li><a href="#">Beverages</a></li>
              <li><a href="#">Snacks & Branded Foods</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Customer Service</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Track Order</a></li>
              <li><a href="#">Returns & Refunds</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">FAQs</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>About Us</h4>
            <ul>
              <li><a href="#">Our Story</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Terms & Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Download App</h4>
            <div className="app-badges">
              <a href="#" className="app-badge">
                <span>📱</span> App Store
              </a>
              <a href="#" className="app-badge">
                <span>🤖</span> Play Store
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 JioMart. All rights reserved.</p>
          <p>Made with ❤️ for online shoppers</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
