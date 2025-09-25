import React, { useState } from 'react';

const SearchFilter = ({ onSearch, onFilter, categories }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    sizeRange: '',
    dateRange: '',
    captionCategory: ''
  });

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters); // Apply filters immediately when changed
  };

  const applyFilters = () => {
    onFilter(filters);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      sizeRange: '',
      dateRange: '',
      captionCategory: ''
    });
    onSearch('');
    onFilter({});
  };

  return (
    <section className="search-section">
      <h3>Search & Filter</h3>
      <div className="search-controls">
        <input
          type="text"
          placeholder="Search by caption, tags, or filename..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
        
        <div className="filter-row">
          <select 
            value={filters.sizeRange}
            onChange={(e) => handleFilterChange('sizeRange', e.target.value)}
          >
            <option value="">All sizes</option>
            <option value="small">Small (&lt;1MB)</option>
            <option value="medium">Medium (1-5MB)</option>
            <option value="large">Large (&gt;5MB)</option>
          </select>
          
          <select 
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <option value="">All dates</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
          </select>
          
          <select 
            value={filters.captionCategory}
            onChange={(e) => handleFilterChange('captionCategory', e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          
          <button onClick={applyFilters} className="btn btn-primary">
            Apply Filters
          </button>
          <button onClick={clearFilters} className="btn btn-secondary">
            Clear
          </button>
        </div>
      </div>
    </section>
  );
};

export default SearchFilter;