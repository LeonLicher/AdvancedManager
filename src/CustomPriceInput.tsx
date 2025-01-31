import React, { useState } from 'react';
import './CustomPriceInput.css'; // Make sure to create this CSS file

interface CustomPriceInputProps {
  customPrice: string;
  onCustomPriceChange: (price: string) => void;
  onBuy: () => void;
  formatPrice: (price: number) => string;
}

const CustomPriceInput: React.FC<CustomPriceInputProps> = ({
  customPrice,
  onCustomPriceChange,
  onBuy,
  formatPrice
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.]/g, '');
    const numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
      setError('Please enter a valid number');
    } else {
      setError(null);
      onCustomPriceChange(value);
    }
  };

  return (
    <div className="custom-price">
      <input
        id="price-input"
        type="text"
        value={customPrice}
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        placeholder="Enter price"
        aria-describedby="price-error"
      />
      {error && <span id="price-error" className="error">{error}</span>}
      <button
        className="buy-button price-change-button"
        onClick={(e) => {
          e.stopPropagation();
          if (!error) onBuy();
        }}
        aria-label="Place bid"
        disabled={!!error || customPrice === ''}
      >
        Bid {formatPrice(parseFloat(customPrice || '0'))}
      </button>
    </div>
  );
};

export default CustomPriceInput;