package com.sandipsky.inventory_system.features.reports.purchase_return.services;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByBatchReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByProductReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnByVendorReportDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.dtos.PurchaseReturnReportRowDTO;
import com.sandipsky.inventory_system.features.reports.purchase_return.repositories.PurchaseReturnReportRepository;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.features.purchase.purchase_return.entities.MasterPurchaseReturn;
import com.sandipsky.inventory_system.common.util.ReportDateUtil;

@Service
public class PurchaseReturnReportService {

    @Autowired
    private PurchaseReturnReportRepository repository;

    public List<PurchaseReturnReportRowDTO> getPurchaseReturnReport(String fromDate, String toDate, String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseReturns(fromDate, toDate).stream().map(this::mapToRow).toList();
    }

    public List<PurchaseReturnByVendorReportDTO> getPurchaseReturnByVendor(String fromDate, String toDate,
            String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseReturnByVendor(fromDate, toDate);
    }

    public List<PurchaseReturnByProductReportDTO> getPurchaseReturnByProduct(String fromDate, String toDate,
            String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseReturnByProduct(fromDate, toDate);
    }

    public List<PurchaseReturnByBatchReportDTO> getPurchaseReturnByBatch(String fromDate, String toDate,
            String dateType) {
        ReportDateUtil.validateDateType(dateType);
        return repository.findPurchaseReturnByBatch(fromDate, toDate);
    }

    private PurchaseReturnReportRowDTO mapToRow(MasterPurchaseReturn entity) {
        PurchaseReturnReportRowDTO row = new PurchaseReturnReportRowDTO();
        row.setId(entity.getId());
        row.setDate(entity.getDate());
        row.setSystemEntryNo(entity.getSystemEntryNo());
        row.setBillNo(entity.getBillNo());
        if (entity.getVendor() != null) {
            row.setVendorName(entity.getVendor().getName());
        }
        row.setTransactionType(entity.getTransactionType());
        row.setSubTotal(entity.getSubTotal());
        row.setDiscount(entity.getDiscount());
        row.setNonTaxableAmount(entity.getNonTaxableAmount());
        row.setTaxableAmount(entity.getTaxableAmount());
        row.setTotalTax(entity.getTotalTax());
        row.setGrandTotal(entity.getGrandTotal());
        return row;
    }
}
