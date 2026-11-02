package com.sandipsky.inventory_system.features.dashboard.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.sandipsky.inventory_system.features.dashboard.dtos.AccountTypeBalanceDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.DateTotalDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.StockLevelDTO;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;

// Read-only aggregates for the dashboard; no CRUD of its own
public interface DashboardRepository extends Repository<ProductStock, Integer> {

    // Debit minus credit of each of the account types, from every journal dated up to toDate
    @Query("""
                SELECT new com.sandipsky.inventory_system.features.dashboard.dtos.AccountTypeBalanceDTO(
                    a.accountType, COALESCE(SUM(je.debitAmount), 0.0) - COALESCE(SUM(je.creditAmount), 0.0))
                FROM JournalEntry je JOIN je.masterAccount a, MasterJournalEntry mje
                WHERE je.masterJournalEntryId = mje.id
                  AND mje.date <= :toDate
                  AND a.accountType IN :accountTypes
                GROUP BY a.accountType
            """)
    List<AccountTypeBalanceDTO> findBalancesByAccountType(
            @Param("toDate") String toDate, @Param("accountTypes") List<String> accountTypes);

    @Query("""
                SELECT COALESCE(SUM(m.grandTotal), 0.0)
                FROM MasterPurchaseEntry m
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
            """)
    Double sumPurchases(@Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT COALESCE(SUM(m.grandTotal), 0.0)
                FROM MasterPurchaseReturn m
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
            """)
    Double sumPurchaseReturns(@Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT COALESCE(SUM(m.grandTotal), 0.0)
                FROM MasterSalesEntry m
                WHERE m.isCancelled = false
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
            """)
    Double sumSales(@Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT COALESCE(SUM(m.grandTotal), 0.0)
                FROM MasterSalesReturn m
                WHERE m.isCancelled = false
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
            """)
    Double sumSalesReturns(@Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.dashboard.dtos.DateTotalDTO(m.date, SUM(m.grandTotal))
                FROM MasterPurchaseEntry m
                WHERE m.date >= :fromDate AND m.date <= :toDate
                GROUP BY m.date
            """)
    List<DateTotalDTO> findPurchaseTotalsByDate(@Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.dashboard.dtos.DateTotalDTO(m.date, SUM(m.grandTotal))
                FROM MasterSalesEntry m
                WHERE m.isCancelled = false
                  AND m.date >= :fromDate AND m.date <= :toDate
                GROUP BY m.date
            """)
    List<DateTotalDTO> findSalesTotalsByDate(@Param("fromDate") String fromDate, @Param("toDate") String toDate);

    // Batches with stock whose expiry date is on or before toDate, expired ones included; soonest first
    @Query("""
                SELECT ps
                FROM ProductStock ps JOIN FETCH ps.product
                WHERE ps.quantity > 0
                  AND ps.expiryDate IS NOT NULL AND ps.expiryDate <> ''
                  AND ps.expiryDate <= :toDate
                ORDER BY ps.expiryDate, ps.quantity DESC
            """)
    List<ProductStock> findBatchesExpiringBy(@Param("toDate") String toDate);

    // Stock of every active product that holds stock (service items hold none), by name
    @Query("""
                SELECT new com.sandipsky.inventory_system.features.dashboard.dtos.StockLevelDTO(
                    p.id, p.name, p.code, COALESCE(SUM(ps.quantity), 0.0), p.minStock)
                FROM Product p LEFT JOIN ProductStock ps ON ps.product = p
                WHERE p.isActive = true
                  AND p.isServiceItem = false
                GROUP BY p.id, p.name, p.code, p.minStock
                ORDER BY p.name
            """)
    List<StockLevelDTO> findActiveStockLevels();
}
