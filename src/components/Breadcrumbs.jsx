import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Breadcrumbs.css';

function Breadcrumbs({ items }) {
    const navigate = useNavigate();

    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol className="breadcrumb-list">
                {items.map((item, index) => (
                    <li key={index} className="breadcrumb-item">
                        {index < items.length - 1 ? (
                            <>
                                <button
                                    onClick={() => navigate(item.path)}
                                    className="breadcrumb-link"
                                >
                                    {item.label}
                                </button>
                                <span className="breadcrumb-separator">/</span>
                            </>
                        ) : (
                            <span className="breadcrumb-current">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export default Breadcrumbs;
