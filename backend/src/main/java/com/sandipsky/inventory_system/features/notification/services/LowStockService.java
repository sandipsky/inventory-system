package com.sandipsky.inventory_system.features.notification.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.sandipsky.inventory_system.features.product.entities.Product;
import com.sandipsky.inventory_system.features.product.repositories.ProductRepository;
import com.sandipsky.inventory_system.features.product.repositories.ProductStockRepository;
import com.sandipsky.inventory_system.features.settings.configuration.entities.Configuration;
import com.sandipsky.inventory_system.features.settings.configuration.repositories.ConfigurationRepository;

// Notifies when a save leaves a product's stock, all batches added up, at or below the
// low_stock_quantity setting. Only saves that lower a product's stock alert; blank turns alerts off.
@Service
public class LowStockService {

    public static final String SETTING = "low_stock_quantity";

    private static final Logger log = LoggerFactory.getLogger(LowStockService.class);

    // A product's alert: what it is, and the message
    record StockAlert(NotificationType type, int productId, String title, String message) {
    }

    @Autowired
    private ConfigurationRepository configurationRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductStockRepository productStockRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    // Called by StockChangeListener for every write to a batch's quantity. The changes add up per
    // product until the transaction commits; a rolled-back save alerts nobody.
    public void recordChange(int productId, double change) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        changesInTransaction().byProduct.merge(productId, change, Double::sum);
    }

    private StockChanges changesInTransaction() {
        for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
            if (synchronization instanceof StockChanges changes) {
                return changes;
            }
        }
        StockChanges changes = new StockChanges();
        TransactionSynchronizationManager.registerSynchronization(changes);
        return changes;
    }

    // One per transaction that changes stock
    private class StockChanges implements TransactionSynchronization {
        final Map<Integer, Double> byProduct = new HashMap<>();

        @Override
        public void afterCommit() {
            alert(byProduct);
        }
    }

    private void alert(Map<Integer, Double> changes) {
        try {
            TransactionTemplate read = new TransactionTemplate(transactionManager);
            read.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            read.setReadOnly(true);
            List<StockAlert> alerts = read.execute(status -> stockAlerts(changes));
            for (StockAlert alert : alerts) {
                notificationService.notifyStock(alert.type(), alert.title(), alert.message(),
                        "product:" + alert.productId());
            }
        } catch (RuntimeException ex) {
            log.warn("Could not check stock levels for products {}", changes.keySet(), ex);
        }
    }

    private List<StockAlert> stockAlerts(Map<Integer, Double> changes) {
        Double threshold = threshold(configurationRepository.findByName(SETTING)
                .map(Configuration::getValue).orElse(null));
        List<StockAlert> alerts = new ArrayList<>();
        if (threshold == null) {
            return alerts;
        }
        for (Map.Entry<Integer, Double> change : changes.entrySet()) {
            if (change.getValue() >= 0) {
                continue;
            }
            Product product = productRepository.findById(change.getKey()).orElse(null);
            if (product == null || product.isServiceItem() || !product.isActive()) {
                continue;
            }
            double total = productStockRepository.sumQuantityByProductId(product.getId());
            StockAlert alert = stockAlert(product.getId(), product.getName(),
                    product.getUnit() == null ? null : product.getUnit().getName(), total, threshold);
            if (alert != null) {
                alerts.add(alert);
            }
        }
        return alerts;
    }

    // The low stock quantity, or null (alerts off) when the setting is blank or not a number ≥ 0
    public static Double threshold(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            double threshold = Double.parseDouble(value.trim());
            return threshold >= 0 && Double.isFinite(threshold) ? threshold : null;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    // Null while the product has more than the low stock quantity
    static StockAlert stockAlert(int productId, String productName, String unit, double total, double threshold) {
        if (total <= 0) {
            return new StockAlert(NotificationType.OUT_OF_STOCK, productId, "Out of stock",
                    productName + " has no stock left.");
        }
        if (total <= threshold) {
            String left = NotificationService.quantity(total) + (unit == null || unit.isBlank() ? "" : " " + unit);
            return new StockAlert(NotificationType.LOW_STOCK, productId, "Low stock",
                    productName + " is down to " + left + ", at or below the low stock quantity of "
                            + NotificationService.quantity(threshold) + ".");
        }
        return null;
    }
}
