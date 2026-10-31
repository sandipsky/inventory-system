package com.sandipsky.inventory_system.features.product.services;
import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.exception.ResourceNotFoundException;

@Service
public class ProductStockService {

    @Autowired
    private ProductStockRepository repository;

    // Purchases, sales returns and opening stock bring goods into the batch they name, or the
    // product's default batch when they name none. Batch numbers are unique per product, so lines
    // naming the same batch add up in one batch. A new batch comes back unsaved with zero quantity.
    public ProductStock findOrCreateBatch(Product product, String batchNo, String expiryDate) {
        String number = blankToNull(batchNo);
        ProductStock batch = number == null
                ? repository.findByProductIdAndBatchNoIsNull(product.getId())
                : repository.findByProductIdAndBatchNo(product.getId(), number);
        if (batch == null) {
            batch = new ProductStock();
            batch.setProduct(product);
            batch.setBatchNo(number);
            batch.setQuantity(0.0);
        }
        // A batch keeps its expiry date; a different one on a line is a typing mistake (correct a
        // wrong date deliberately through Stock Edit). Blank leaves the batch's date alone.
        String expiry = blankToNull(expiryDate);
        if (expiry != null) {
            if (batch.getExpiryDate() != null && !batch.getExpiryDate().equals(expiry)) {
                throw new BadRequestException("Batch " + number + " of " + product.getName()
                        + " already has expiry date " + batch.getExpiryDate());
            }
            batch.setExpiryDate(expiry);
        }
        return batch;
    }

    // Sales, purchase returns and stock adjustments pick an existing batch; batch id 0 means the
    // product's default batch. Returns null when the product has no default batch.
    public ProductStock findBatch(Product product, int batchId) {
        if (batchId == 0) {
            return repository.findByProductIdAndBatchNoIsNull(product.getId());
        }
        ProductStock batch = repository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found"));
        if (batch.getProduct().getId() != product.getId()) {
            throw new BadRequestException("Batch does not belong to " + product.getName());
        }
        return batch;
    }

    // The batch a saved line moved stock in; lines saved before batches existed have none and
    // moved the product's default batch
    public ProductStock lineBatch(ProductStock batch, Product product) {
        if (batch != null) {
            return batch;
        }
        ProductStock fallback = findBatch(product, 0);
        if (fallback == null) {
            throw new ResourceNotFoundException("Product Stock not found");
        }
        return fallback;
    }

    // How a batch is addressed in the API: the product's default (no-batch) row is always batch id
    // 0, every other batch is its stock row id
    public int batchId(ProductStock batch) {
        return batch.getBatchNo() == null ? 0 : batch.getId();
    }

    private String blankToNull(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}
