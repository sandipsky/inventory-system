package com.sandipsky.inventory_system.features.reports.purchase.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_entry.entities.MasterPurchaseEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseReportRepository extends JpaRepository<MasterPurchaseEntry, Integer> {

    @Query("""
                SELECT m
                FROM MasterPurchaseEntry m
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                ORDER BY m.date, m.id
            """)
    List<MasterPurchaseEntry> findPurchaseEntries(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByVendorReportDTO(
                    v.id, v.name, COUNT(m), SUM(m.subTotal), SUM(m.totalTax), SUM(m.grandTotal))
                FROM MasterPurchaseEntry m JOIN m.vendor v
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY v.id, v.name
                ORDER BY v.name
            """)
    List<com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByVendorReportDTO> findPurchaseByVendor(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByProductReportDTO(
                    p.id, p.name, SUM(pe.quantity), SUM(pe.quantity * pe.costPrice))
                FROM PurchaseEntry pe JOIN pe.product p, MasterPurchaseEntry m
                WHERE pe.masterPurchaseEntryId = m.id
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY p.id, p.name
                ORDER BY p.name
            """)
    List<com.sandipsky.inventory_system.features.reports.purchase.dtos.PurchaseByProductReportDTO> findPurchaseByProduct(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
