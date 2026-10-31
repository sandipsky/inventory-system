package com.sandipsky.inventory_system.features.reports.sales.repositories;
import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesReportRepository extends JpaRepository<MasterSalesEntry, Integer> {

    @Query("""
                SELECT m
                FROM MasterSalesEntry m
                WHERE (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                ORDER BY m.date, m.id
            """)
    List<MasterSalesEntry> findSalesEntries(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByCustomerReportDTO(
                    c.id, c.name, COUNT(m), SUM(m.subTotal), SUM(m.totalTax), SUM(m.grandTotal))
                FROM MasterSalesEntry m JOIN m.customer c
                WHERE m.isCancelled = false
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY c.id, c.name
                ORDER BY c.name
            """)
    List<com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByCustomerReportDTO> findSalesByCustomer(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);

    @Query("""
                SELECT new com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByProductReportDTO(
                    p.id, p.name, SUM(se.quantity), SUM(se.quantity * se.sellingPrice))
                FROM SalesEntry se JOIN se.product p, MasterSalesEntry m
                WHERE se.masterSalesEntryId = m.id
                  AND m.isCancelled = false
                  AND (:fromDate IS NULL OR m.date >= :fromDate)
                  AND (:toDate IS NULL OR m.date <= :toDate)
                GROUP BY p.id, p.name
                ORDER BY p.name
            """)
    List<com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByProductReportDTO> findSalesByProduct(
            @Param("fromDate") String fromDate, @Param("toDate") String toDate);
}
