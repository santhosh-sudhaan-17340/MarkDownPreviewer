import { useParams } from 'react-router-dom'
import CategoryNav from '../components/CategoryNav'
import ProductCard from '../components/ProductCard'
import { products } from '../data/products'
import './Category.css'

function Category({ addToCart, searchQuery }) {
  const { category } = useParams()

  let filteredProducts = products.filter(product => product.category === category)

  if (searchQuery) {
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="category-page">
      <CategoryNav activeCategory={category} />

      <div className="container">
        <div className="category-header">
          <h1>{category}</h1>
          <p>{filteredProducts.length} products</p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>No products found in this category{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
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
      </div>
    </div>
  )
}

export default Category
