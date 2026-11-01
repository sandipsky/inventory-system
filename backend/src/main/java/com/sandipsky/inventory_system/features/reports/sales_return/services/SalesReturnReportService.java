package com.sandipsky.inventory_system.features.reports.sales_return.services;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByBatchReportDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByCustomerReportDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.dtos.SalesReturnReportRowDTO;
import com.sandipsky.inventory_system.features.reports.sales_return.repositories.SalesReturnReportRepository;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.sales.sales_return.entities.MasterSalesReturn;
import com.sandipsky.inventory_system.common.util.ReportDateUtil;

@Service
public class SalesReturnReportService {

    @Autowired
    private SalesReturnReportRepository repository;

    public List<SalesReturnReportRowDTO> getSalesReturnReport(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesReturns(fromDate, toDate).stream().map(this::mapToRow).toList();
    }

    public List<SalesReturnByCustomerReportDTO> getSalesReturnByCustomer(String fromDate, String toDate,
            String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesReturnByCustomer(fromDate, toDate);
    }

    public List<SalesReturnByProductReportDTO> getSalesReturnByProduct(String fromDate, String toDate,
            String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesReturnByProduct(fromDate, toDate);
    }

    public List<SalesReturnByBatchReportDTO> getSalesReturnByBatch(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findSalesReturnByBatch(fromDate, toDate);
    }

    private SalesReturnReportRowDTO mapToRow(MasterSalesReturn entity) {
        SalesReturnReportRowDTO row = new SalesReturnReportRowDTO();
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
