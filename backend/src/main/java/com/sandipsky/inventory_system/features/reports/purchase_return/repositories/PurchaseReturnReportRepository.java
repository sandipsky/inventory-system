package com.sandipsky.inventory_system.features.reports.purchase_return.repositories;
import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseReturnReportRepository extends JpaRepository<MasterPurchaseReturn, Integer> {

    @Query("""
                SELECT m
                FROM MasterPurchaseReturn m
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                ORDER BY m.date, m.id
            """)
    List<MasterPurchaseReturn> findPurchaseReturns(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByVendorReportDTO(
                    v.id, v.name, COUNT(m), SUM(m.subTotal), SUM(m.totalTax), SUM(m.grandTotal))
                FROM MasterPurchaseReturn m JOIN m.vendor v
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY v.id, v.name
                ORDER BY v.name
            """)
    List<com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByVendorReportDTO> findPurchaseReturnByVendor(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByProductReportDTO(
                    p.id, p.name, SUM(re.quantity), SUM(re.quantity * re.costPrice))
                FROM PurchaseReturnEntry re JOIN re.product p, MasterPurchaseReturn m
                WHERE re.masterPurchaseReturnId = m.id
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY p.id, p.name
                ORDER BY p.name
            """)
    List<com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByProductReportDTO> findPurchaseReturnByProduct(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByBatchReportDTO(
                    p.id, p.name, CASE WHEN b.batchNo IS NULL THEN 0 ELSE b.id END, b.batchNo, b.expiryDate,
                    SUM(re.quantity), SUM(re.quantity * re.costPrice))
                FROM PurchaseReturnEntry re JOIN re.product p LEFT JOIN re.batch b, MasterPurchaseReturn m
                WHERE re.masterPurchaseReturnId = m.id
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY p.id, p.name, b.id, b.batchNo, b.expiryDate
                ORDER BY p.name, b.batchNo
            """)
    List<com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByBatchReportDTO> findPurchaseReturnByBatch(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
