package com.sandipsky.inventory_system.features.reports.sales.services;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByCustomerReportDTO;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.sales.dtos.SalesReportRowDTO;
import com.sandipsky.inventory_system.features.reports.sales.repositories.SalesReportRepository;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.sales.sales_entry.entities.MasterSalesEntry;
import com.sandipsky.inventory_system.common.util.ReportDateUtil;

@Service
public class SalesReportService {

    @Autowired
    private SalesReportRepository repository;

    public List<SalesReportRowDTO> getSalesReport(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesEntries(fromDate, toDate).stream().map(this::mapToRow).toList();
    }

    public List<SalesByCustomerReportDTO> getSalesByCustomer(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesByCustomer(fromDate, toDate);
    }

    public List<SalesByProductReportDTO> getSalesByProduct(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesByProduct(fromDate, toDate);
    }

    private SalesReportRowDTO mapToRow(MasterSalesEntry entity) {
        SalesReportRowDTO row = new SalesReportRowDTO();
        row.setId(entity.getId());
        row.setDate(entity.getDate());
        row.setSystemEntryNo(entity.getSystemEntryNo());
        if (entity.getCustomer() != null) {
            row.setCustomerName(entity.getCustomer().getName());
        }
        row.setTransactionType(entity.getTransactionType());
        row.setSubTotal(entity.getSubTotal());
        row.setDiscount(entity.getDiscount());
        row.setNonTaxableAmount(entity.getNonTaxableAmount());
        row.setTaxableAmount(entity.getTaxableAmount());
        row.setTotalTax(entity.getTotalTax());
        row.setGrandTotal(entity.getGrandTotal());
        row.setCancelled(entity.isCancelled());
        return row;
    }
}
