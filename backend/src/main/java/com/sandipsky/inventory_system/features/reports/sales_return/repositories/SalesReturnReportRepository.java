package com.sandipsky.inventory_system.features.reports.sales_return.repositories;
import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesReturnReportRepository extends JpaRepository<MasterSalesReturn, Integer> {

    @Query("""
                SELECT m
                FROM MasterSalesReturn m
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                ORDER BY m.date, m.id
            """)
    List<MasterSalesReturn> findSalesReturns(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByCustomerReportDTO(
                    c.id, c.name, COUNT(m), SUM(m.subTotal), SUM(m.totalTax), SUM(m.grandTotal))
                FROM MasterSalesReturn m JOIN m.customer c
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY c.id, c.name
                ORDER BY c.name
            """)
    List<com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByCustomerReportDTO> findSalesReturnByCustomer(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByProductReportDTO(
                    p.id, p.name, SUM(re.quantity), SUM(re.quantity * re.sellingPrice))
                FROM SalesReturnEntry re JOIN re.product p, MasterSalesReturn m
                WHERE re.masterSalesReturnId = m.id
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY p.id, p.name
                ORDER BY p.name
            """)
    List<com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByProductReportDTO> findSalesReturnByProduct(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByBatchReportDTO(
                    p.id, p.name, CASE WHEN b.batchNo IS NULL THEN 0 ELSE b.id END, b.batchNo, b.expiryDate,
                    SUM(re.quantity), SUM(re.quantity * re.sellingPrice))
                FROM SalesReturnEntry re JOIN re.product p LEFT JOIN re.batch b, MasterSalesReturn m
                WHERE re.masterSalesReturnId = m.id
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY p.id, p.name, b.id, b.batchNo, b.expiryDate
                ORDER BY p.name, b.batchNo
            """)
    List<com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByBatchReportDTO> findSalesReturnByBatch(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
