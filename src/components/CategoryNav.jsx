import { Link } from 'react-router-dom'
import { categories } from '../data/products'
import './CategoryNav.css'

function CategoryNav({ activeCategory }) {
  return (
    <div className="category-nav">
      <div className="container">
        <div className="category-list">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.name === 'All' ? '/' : `/category/${category.name}`}
              className={`category-item ${activeCategory === category.name ? 'active' : ''}`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CategoryNav
