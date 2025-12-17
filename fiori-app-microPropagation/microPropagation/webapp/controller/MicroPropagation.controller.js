sap.ui.define([
	"com/9b/MicroPropagation/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/MicroPropagation/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/ui/core/format/DateFormat"
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.MicroPropagation.controller.MicroPropagation", {
		formatter: model,

		onInit: function () {
			this.getAppConfigData();
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
		},
		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "MicroPropagation") {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				sap.ui.core.BusyIndicator.hide();
				this.getView().byId("microPropagationTable").clearSelection();
				jsonModel.setProperty("/sIconTab", "VEGETATION");
				this.loadLicenseData();
			}
		},
		loadLicenseData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/licBusy", true);
			var filters = "?$filter=contains(U_NLCTP, 'Cultivator')";
			this.readServiecLayer("/b1s/v2/U_SNBLIC" + filters, function (data) {
				jsonModel.setProperty("/licBusy", false);
				jsonModel.setProperty("/licenseList", data.value);
				jsonModel.setProperty("/sLinObj", data.value[0]);
				that.loadStrainData();
			});
		},
		onChanageLicenseType: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sObj = evt.getParameter("selectedItem").getBindingContext("jsonModel").getObject();
			jsonModel.setProperty("/sLinObj", sObj);
			this.loadStrainData();
		},
		onTabChange: function (evt) {
			this.loadMasterData();
		},
		loadStrainData: function () {
			var that = this;
			var licenseNo;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sLicenNo = jsonModel.getProperty("/selectedLicense");
			if (sLicenNo !== undefined) {
				licenseNo = sLicenNo;
			} else if (jsonModel.getProperty("/licenseList").length > 0) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			} else {
				licenseNo = "";
			}
			var filters = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and U_NISUD eq 'No'";
			var select = "&$select=U_NPSVG,U_NPKMG,U_NSTNM,DocNum,U_NSTTP";
			this.readServiecLayer("/b1s/v2/NSDN" + filters + select, function (itemData) {
				jsonModel.setProperty("/strainList", itemData.value);
				that.loadMasterData();
			}, this.getView());
		},
		loadMasterData: function () {
			var that = this;
			var licenseNo;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sLicenNo = jsonModel.getProperty("/selectedLicense");
			if (sLicenNo !== undefined) {
				licenseNo = sLicenNo;
			} else if (jsonModel.getProperty("/licenseList").length > 0) {
				licenseNo = jsonModel.getProperty("/licenseList")[0].Code;
			} else {
				licenseNo = "";
			}
			var selTab = this.byId("phenoTab").getSelectedKey();
			var filters;
			if (selTab == "VEGETATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'Cutting' ";
			} else if (selTab == "MPROPAGATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'MP_Preserve'";
			} else if (selTab == "PROPAGATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'MP_Multiply'";
			} else if (selTab == "PACKAGING") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo + "'  and Quantity ne 0 and U_Phase eq 'MP_Store'";
			}
			var orderBy = "&$orderby=BatchNum desc";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters + orderBy, function (data) {
				$.grep(data.value, function (plantData) {
					plantData.U_NSTNM = "";
					if (plantData.ItemName) {
						var strainName = plantData.ItemName.split(" - ");
						if (strainName.length > 0) {
							plantData.U_NSTNM = strainName[0];
						}
					}
				});

				//code for display updated date time
				var cDate = new Date();
				var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
					pattern: "KK:mm:ss a"
				});
				var refreshText = dateFormat.format(cDate);
				jsonModel.setProperty("/refreshText", "Last Updated " + refreshText);
				jsonModel.setProperty("/refreshState", "Success");
				jsonModel.setProperty("/microPropagationTableData", data.value);
				this.byId("tableHeader").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader1").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader2").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader3").setText("Plants (" + data.value.length + ")");
			}, this.getView());
		},

		/***method start for move cuttings phase***/
		moveCuttings: function () {
			var sItems, that = this;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				if (!this.moveCuttingsDialog) {
					this.moveCuttingsDialog = sap.ui.xmlfragment("moveCuttingsDialog",
						"com.9b.MicroPropagation.view.fragments.MoveCuttingsDialog", this);
					this.getView().addDependent(this.moveCuttingsDialog);
				}
				sap.ui.core.Fragment.byId("moveCuttingsDialog", "growthPhase").setSelectedKey("");
				sap.ui.core.Fragment.byId("moveCuttingsDialog", "mDate").setDateValue(new Date());
				this.moveCuttingsDialog.open();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		onMoveCuttingsClose: function () {
			this.moveCuttingsDialog.close();
		},
		onMoveCuttings: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("moveCuttingsDialog", "growthPhase").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("moveCuttingsDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			var that = this;
			var sItems;
			sItems = table.getSelectedIndices();
			var batchUrl = [],
				sObj;

			if (vRoom === "Preservation") {
				var Phase = "MP_Preserve";
				var phaseText = "Preservation";
			} else {
				var Phase = "MP_Multiply";
				var phaseText = "Multiplication";
			}
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var payLoadFloInventoryEntry = {
					U_Phase: Phase,
					//U_FlowerDate: changeDate, //"20230115", <Selected Date in format --> YYYYMMDD>
				};
				batchUrl.push({
					url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
					data: payLoadFloInventoryEntry,
					method: "PATCH"
				});
			});
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to " + phaseText);
				}
				that.moveCuttingsDialog.close();
				that.moveCuttingsDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.moveCuttingsDialog);
		},
		/***method end for move cuttings phase***/

		sendToStorage: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var microPropagationTable = this.getView().byId("microPropagationTable");
			sItems = microPropagationTable.getSelectedIndices();
			if (sItems.length > 0) {
				sap.m.MessageBox.confirm("Are you sure you want to move these plants for Storage ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = microPropagationTable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "MP_Store"
								};
								batchUrl.push({
									url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
									data: payLoadInventoryEntry,
									method: "PATCH"
								});
							});
							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are moved for storage");
								}
								that.loadStrainData();
								microPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},

		sendToMultiplication: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var microPropagationTable = this.getView().byId("microPropagationTable");
			sItems = microPropagationTable.getSelectedIndices();
			if (sItems.length > 0) {
				sap.m.MessageBox.confirm("Are you sure you want to move these plants for Multiplication ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = microPropagationTable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "MP_Multiply"
								};
								batchUrl.push({
									url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
									data: payLoadInventoryEntry,
									method: "PATCH"
								});
							});
							jsonModel.setProperty("/errorTxt", []);
							that.createBatchCall(batchUrl, function () {
								var errorTxt = jsonModel.getProperty("/errorTxt");
								if (errorTxt.length > 0) {
									sap.m.MessageBox.error(errorTxt.join("\n"));
								} else {
									sap.m.MessageToast.show("Selected plants are moved for Multiplication");
								}
								that.loadStrainData();
								microPropagationTable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},

		markAsClones: function () {

		},

		/** Method for clear all filters**/
		clearAllFilters: function () {
			this.onCloseRefreshChart();
			var filterTable = this.getView().byId("microPropagationTable");
			var aColumns = filterTable.getColumns();
			for (var i = 0; i <= aColumns.length; i++) {
				filterTable.filter(aColumns[i], null);
				filterTable.sort(aColumns[i], null);
			}
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
		},

		/***method start for change growth phase***/
		changeGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Cannabis Plant") == -1) {
					if (!this.changeGrowthPhaseDialog) {
						this.changeGrowthPhaseDialog = sap.ui.xmlfragment("changeGrowthPhaseDialog",
							"com.9b.MicroPropagation.view.fragments.ChangeGrowthPhase", this);
						this.getView().addDependent(this.changeGrowthPhaseDialog);
					}
					if (updateObject.ItemName.search("Seedling") !== -1) {
						jsonModel.setProperty("/gPhase", "Vegetative");
					}
					sap.ui.core.Fragment.byId("changeGrowthPhaseDialog", "avalQty").setValue(sItems.length);
					sap.ui.core.Fragment.byId("changeGrowthPhaseDialog", "location").setSelectedKey("");
					sap.ui.core.Fragment.byId("changeGrowthPhaseDialog", "mDate").setDateValue(new Date());
					this.changeGrowthPhaseDialog.open();
					this.loadAllCloneData();
				} else {
					sap.m.MessageToast.show("You can not change the growth phase of this plant");
					return;
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		onChangeGrowthPhaseClose: function () {
			this.changeGrowthPhaseDialog.close();
		},
		chageGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("microPropagationTable");
			var vRoom = sap.ui.core.Fragment.byId("changeGrowthPhaseDialog", "growthPhase").getSelectedKey();
			var locationID = sap.ui.core.Fragment.byId("changeGrowthPhaseDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("changeGrowthPhaseDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			if (locationID === "") {
				sap.m.MessageToast.show("Please select Location");
				return;
			}
			var that = this;
			var sItems;
			sItems = table.getSelectedIndices();
			var count = sItems.length;
			if (sItems.length == 0) {
				sap.m.MessageToast.show("Please select atleast one plant");
				return;
			}

			//inventory entry to seedling item
			var cannabisItemCodeList = jsonModel.getProperty("/cannabisItemCodeList");
			var cannabisItemArray = [],
				invTraDesDataEntry = [],
				batchUrl = [];
			var sObj, payLoadInventory, cannabisItemCode;

			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				var itemName = sObj.ItemName;
				var strainName = itemName.split(" - ")[0];
				$.each(cannabisItemCodeList, function (i, e2) {
					if (e2.ItemName === strainName + " - " + "Cannabis Plant") {
						cannabisItemArray.push(e2);
					}
				});
				if (cannabisItemArray.length > 0) {
					cannabisItemCode = cannabisItemArray[0].ItemCode;
				}

				if (invTraDesDataEntry.length > 0) {
					if (sObj.ItemCode === invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[0].ItemCode) {
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines.push({
							"LineNum": invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length -
									1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": cannabisItemCode,
							"Quantity": 1,
							"WarehouseCode": locationID,
							"BatchNumbers": []
						});
						invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines[invTraDesDataEntry[invTraDesDataEntry.length - 1].DocumentLines
								.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": locationID,
								"U_Phase": "PhenoSVeg",
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocDate": createdDate,
							"DocDueDate": createdDate,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": cannabisItemCode,
								"WarehouseCode": locationID,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": locationID,
									"U_Phase": "PhenoSVeg",
									"ManufacturerSerialNumber": sObj.MnfSerial,
									"InternalSerialNumber": sObj.IntrSerial,
								}]
							}]
						};
						invTraDesDataEntry.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocDate": createdDate,
						"DocDueDate": createdDate,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": cannabisItemCode,
							"WarehouseCode": locationID,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": locationID,
								"U_Phase": "PhenoSVeg",
								"ManufacturerSerialNumber": sObj.MnfSerial,
								"InternalSerialNumber": sObj.IntrSerial,
							}]
						}]
					};
					invTraDesDataEntry.push(payLoadInventory);
				}
			});

			$.grep(invTraDesDataEntry, function (invTransObjEntry) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenEntries",
					data: invTransObjEntry,
					method: "POST"
				});
			});

			//inventory exit to selected Item
			var invTraDesData = [];
			$.each(sItems, function (i, e) {
				sObj = table.getContextByIndex(e).getObject();
				if (invTraDesData.length > 0) {
					if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
						invTraDesData[invTraDesData.length - 1].DocumentLines.push({
							"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
								1].LineNum + 1,
							"ItemCode": sObj.ItemCode,
							"Quantity": 1,
							"WarehouseCode": sObj.WhsCode,
							"BatchNumbers": []
						});
						invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
							.push({
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							});
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				} else {
					payLoadInventory = {
						"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
						"DocumentLines": [{
							"LineNum": 0,
							"ItemCode": sObj.ItemCode,
							"WarehouseCode": sObj.WhsCode,
							"Quantity": 1,
							"BatchNumbers": [{
								"BatchNumber": sObj.BatchNum,
								"Quantity": 1,
								"Location": sObj.WhsCode
							}]
						}]
					};
					invTraDesData.push(payLoadInventory);
				}
			});

			$.grep(invTraDesData, function (invTransObj) {
				batchUrl.push({
					url: "/b1s/v2/InventoryGenExits",
					data: invTransObj,
					method: "POST"
				});
			});

			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to Vegetative");
				}
				that.changeGrowthPhaseDialog.close();
				that.changeGrowthPhaseDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("microPropagationTable").setSelectedIndex(-1);
			}, this.changeGrowthPhaseDialog);
		},
		/***method end for change growth phase***/

		/*method for destroy the plants start*/
		performDestroyPlants: function () {
			var that = this;
			var sItems;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();

			if (sItems.length > 0) {
				//check single batch is selected or not
				var batchIDArray = [];
				$.each(sItems, function (i, e) {
					var sObj = table.getContextByIndex(e).getObject();
					batchIDArray.push(sObj.IntrSerial);
				});
				var allSame = new Set(batchIDArray).size === 1;
				if (allSame == false) {
					sap.m.MessageToast.show("Please select same batch ID");
					return;
				}

				if (!this.confirmDestroyDialog) {
					this.confirmDestroyDialog = sap.ui.xmlfragment("ConfirmDestroyPlant", "com.9b.MicroPropagation.view.fragments.DestroyPlant",
						this);
					this.getView().addDependent(this.confirmDestroyDialog);
				}
				this.getView().getModel("jsonModel").setProperty("/oDesctroyPlants", {});
				this.confirmDestroyDialog.bindElement("jsonModel>/oDesctroyPlants");
				sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").setDateValue(new Date());
				that.onLoadWasteReasonMethod();
				this.confirmDestroyDialog.open();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
				return;
			}
		},
		onWtChange: function (evt) {
			var value = evt.getParameter("newValue");
			value = value.replace(/[^.\d]/g, '').replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2");
			evt.getSource().setValue(value);
		},
		onLoadWasteReasonMethod: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			this.readServiecLayer("/b1s/v2/U_NWMET", function (e) {
				jsonModel.setProperty("/WasteMethodsList", e.value);
			});
			this.readServiecLayer("/b1s/v2/U_NWREA", function (e) {
				jsonModel.setProperty("/WasteReasonsList", e.value);
			});
		},
		onDestroyClose: function () {
			this.confirmDestroyDialog.close();
		},
		onDestroyPlant: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			var that = this;
			var wMethod = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wMethod").getSelectedKey();
			var matUsed = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "matUsed").getValue();
			var uom = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "uom").getSelectedKey();
			var reason = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "reason").getSelectedKey();
			var notes = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "notes").getValue();
			var wRecDate = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").getValue();
			var wasteWt = Number(sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wasteWt").getValue());
			if (wMethod === "") {
				sap.m.MessageToast.show("Please select waste method");
				return;
			} else if (matUsed === "") {
				sap.m.MessageToast.show("Please enter material used");
				return;
			} else if (wasteWt === "" || wasteWt === 0) {
				sap.m.MessageToast.show("Please enter waste weight");
				return;
			} else if (isNaN(wasteWt)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			} else if (uom === "") {
				sap.m.MessageToast.show("Please select waste UOM");
				return;
			} else if (reason === "") {
				sap.m.MessageToast.show("Please select reason");
				return;
			} else if (notes === "") {
				sap.m.MessageToast.show("Please add notes");
				return;
			} else if (wRecDate === "") {
				sap.m.MessageToast.show("Please select Date");
				return;
			}
			var createDate = sap.ui.core.Fragment.byId("ConfirmDestroyPlant", "wRecDate").getDateValue();
			var cDate = this.convertUTCDateTime(createDate);
			var invTraDesData = [],
				metricPayload = [],
				sObj,
				cDate = this.convertUTCDateTime(createDate),
				payLoadInventory,
				batchUrl = [],
				payLoadUpdate, payLoadDestroyCreate;
			if (sItems.length > 0) {
				$.each(sItems, function (i, e) {
					sObj = table.getContextByIndex(e).getObject();
					var itemName = sObj.ItemName;
					var strainName = itemName.split(" - ")[0];
					payLoadDestroyCreate = {
						U_NPLID: sObj.BatchNum,
						U_NWTMT: wMethod,
						U_NMTUS: matUsed,
						U_NWTWT: wasteWt.toFixed(2),
						U_NWTUM: uom,
						U_NDTRS: reason,
						U_NNOTE: notes,
						U_NPQTY: 1,
						U_NCRDT: cDate,
						U_NPBID: sObj.IntrSerial,
						U_NSTNM: strainName,
						U_NLCNM: sObj.WhsCode + " - " + sObj.WhsName, //location
						U_NCLPL: "Plant", // clone or plant
						U_NPHSE: "Pheno", //phase
						U_NLFID: jsonModel.getProperty("/selectedLicense")
					};
					batchUrl.push({
						url: "/b1s/v2/NDRPL",
						data: payLoadDestroyCreate,
						method: "POST"
					});
					if (invTraDesData.length > 0) {
						if (sObj.ItemCode === invTraDesData[invTraDesData.length - 1].DocumentLines[0].ItemCode) {
							invTraDesData[invTraDesData.length - 1].DocumentLines.push({
								"LineNum": invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length -
									1].LineNum + 1,
								"ItemCode": sObj.ItemCode,
								"Quantity": 1,
								"WarehouseCode": sObj.WhsCode,
								"BatchNumbers": []
							});
							invTraDesData[invTraDesData.length - 1].DocumentLines[invTraDesData[invTraDesData.length - 1].DocumentLines.length - 1].BatchNumbers
								.push({
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								});
						} else {
							payLoadInventory = {
								"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"DocumentLines": [{
									"LineNum": 0,
									"ItemCode": sObj.ItemCode,
									"WarehouseCode": sObj.WhsCode,
									"Quantity": 1,
									"BatchNumbers": [{
										"BatchNumber": sObj.BatchNum,
										"Quantity": 1,
										"Location": sObj.WhsCode
									}]
								}]
							};
							invTraDesData.push(payLoadInventory);
						}
					} else {
						payLoadInventory = {
							"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"DocumentLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"WarehouseCode": sObj.WhsCode,
								"Quantity": 1,
								"BatchNumbers": [{
									"BatchNumber": sObj.BatchNum,
									"Quantity": 1,
									"Location": sObj.WhsCode
								}]
							}]
						};
						invTraDesData.push(payLoadInventory);
					}
				});
				$.grep(invTraDesData, function (invTransObj) {
					batchUrl.push({
						url: "/b1s/v2/InventoryGenExits",
						data: invTransObj,
						method: "POST"
					});
				});

				var selObject = table.getContextByIndex(sItems[0]).getObject();
				var payLoadWasteCreate = {
					U_NPBID: selObject.IntrSerial,
					U_NWTMT: wMethod,
					U_NMTUS: matUsed,
					U_NWTWT: wasteWt.toFixed(2),
					U_NWTUM: uom,
					U_NWTRS: reason,
					U_NNOTE: notes,
					U_NCRDT: cDate,
					U_NLUDT: that.convertUTCDateTime(new Date()),
					U_NLCNM: selObject.WhsCode + " - " + selObject.WhsName,
					U_NLFID: jsonModel.getProperty("/selectedLicense"), //license name
					U_NPQTY: sItems.length
				};
				batchUrl.push({
					url: "/b1s/v2/NWTHS",
					data: payLoadWasteCreate,
					method: "POST"
				});

				jsonModel.setProperty("/errorTxt", []);
				this.createBatchCall(batchUrl, function () {
					var errorTxt = jsonModel.getProperty("/errorTxt");
					if (errorTxt.length > 0) {
						sap.m.MessageBox.error(errorTxt.join("\n"));
					} else {
						sap.m.MessageToast.show("Plant Status Changed Successfully");
					}
					sap.m.MessageToast.show("Plant Status Changed Successfully");
					that.byId("microPropagationTable").setSelectedIndex(-1);
					that.confirmDestroyDialog.close();
					that.loadStrainData();
				}, this.confirmDestroyDialog);
			} else {
				sap.m.MessageToast.show("Please select atleast one record");
			}
		},
		/*method for destroy the plants end*/

		/*code for mark as propagation start*/

		/****method for change location start********/
		changeLocation: function () {
			var sItems, updateObject;
			var table = this.getView().byId("microPropagationTable");
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (!this.changeLocationDialog) {
					this.changeLocationDialog = sap.ui.xmlfragment("changeLocationDialog", "com.9b.MicroPropagation.view.fragments.ChangeLocation",
						this);
					this.getView().addDependent(this.changeLocationDialog);
				}
				sap.ui.core.Fragment.byId("changeLocationDialog", "location").setSelectedKey("");

				if (updateObject.ItemName.search("Seedling") !== -1) {
					var createSeedlings = jsonModel.getProperty("/createSeedlings");
					jsonModel.setProperty("/ChangeLocationData", createSeedlings);
				} else if (updateObject.ItemName.search("Cannabis Plant") !== -1) {
					var cannabisLocationList = jsonModel.getProperty("/cannabisLocationList");
					jsonModel.setProperty("/ChangeLocationData", cannabisLocationList);
				}
				this.changeLocationDialog.open();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		onChangeLocationClose: function () {
			this.changeLocationDialog.close();
		},
		onChangeLocation: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems;
			var that = this;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
			var locationID = sap.ui.core.Fragment.byId("changeLocationDialog", "location").getSelectedKey();
			if (locationID == "") {
				sap.m.MessageToast.show("Please Select Location");
				return;
			}
			var count = sItems.length;
			var sObj, payLoadUpdate, invTrasData = [],
				batchUrl = [];
			$.each(sItems, function (i, e) {
				var payLoadInventory = {};
				sObj = table.getContextByIndex(e).getObject();
				if (sObj.WhsCode == locationID) {
					sap.m.MessageToast.show("You have selected same location, Please select another location");
					return;
				}
				if (sObj.WhsCode !== locationID) {
					if (invTrasData.length > 0) {
						var returntrasObj, returnLines;
						returntrasObj = $.grep(invTrasData, function (trasObj) {
							if (trasObj.FromWarehouse === sObj.WhsCode) {
								return trasObj;
							}
						});
						if (returntrasObj.length > 0) {
							returnLines = $.grep(returntrasObj[0].StockTransferLines, function (lines) {
								if (lines.ItemCode === sObj.ItemCode) {
									return lines;
								}
							});
							if (returnLines.length > 0) {
								returnLines[0].BatchNumbers.push({
									"BatchNumberProperty": sObj.BatchNum,
									"Quantity": 1
								});
								returnLines[0].Quantity = returnLines[0].BatchNumbers.length;
							} else {
								returntrasObj[0].StockTransferLines.push({
									"LineNum": returntrasObj[0].StockTransferLines.length,
									"ItemCode": sObj.ItemCode,
									"Quantity": 1,
									"WarehouseCode": locationID,
									"FromWarehouseCode": sObj.WhsCode,
									"BatchNumbers": [{
										"BatchNumberProperty": sObj.BatchNum,
										"Quantity": 1
									}]
								});
							}
						} else {
							payLoadInventory = {
								"FromWarehouse": sObj.WhsCode,
								"ToWarehouse": locationID,
								"BPLID": jsonModel.getProperty("/sLinObj").U_NBRCD,
								"StockTransferLines": [{
									"LineNum": 0,
									"ItemCode": sObj.ItemCode,
									"Quantity": 1,
									"WarehouseCode": locationID,
									"FromWarehouseCode": sObj.WhsCode,
									"BatchNumbers": [{
										"BatchNumberProperty": sObj.BatchNum,
										"Quantity": 1
									}]
								}]
							};
							invTrasData.push(payLoadInventory);
						}
					} else {
						payLoadInventory = {
							"FromWarehouse": sObj.WhsCode,
							"ToWarehouse": locationID,
							"BPLID": jsonModel.getProperty("/sLinObj").U_NBRCD,
							"StockTransferLines": [{
								"LineNum": 0,
								"ItemCode": sObj.ItemCode,
								"Quantity": 1,
								"WarehouseCode": locationID,
								"FromWarehouseCode": sObj.WhsCode,
								"BatchNumbers": [{
									"BatchNumberProperty": sObj.BatchNum,
									"Quantity": 1
								}]
							}]
						};
						invTrasData.push(payLoadInventory);
					}
				}
			});
			$.grep(invTrasData, function (invTransObj) {
				batchUrl.push({
					url: "/b1s/v2/StockTransfers",
					data: invTransObj,
					method: "POST"
				});
			});
			jsonModel.setProperty("/errorTxt", []);
			if (batchUrl.length > 0) {
				this.createBatchCall(batchUrl, function () {
					var errorTxt = jsonModel.getProperty("/errorTxt");
					if (errorTxt.length > 0) {
						sap.m.MessageBox.error(errorTxt.join("\n"));
					} else {
						sap.m.MessageToast.show("Plant Location Changed Successfully");
					}
					that.changeLocationDialog.close();
					sap.m.MessageToast.show("Plant Location Changed Successfully");
					that.loadStrainData();
					that.byId("microPropagationTable").setSelectedIndex(-1);
				}, this.changeLocationDialog);
			}
		},
		/****method for change location end********/

		onFilterTable: function (evt) {
			var customData = evt.getParameter("column").getLabel().getCustomData();
			if (customData.length > 0 && customData[0].getKey() === "DAYS") {
				var sValue = evt.getParameter("value");
				var filters = [new sap.ui.model.Filter("Quantity", "EQ", sValue)];
				this.byId("microPropagationTable").getBinding("rows").filter(filters);
			}
		},
		/*Methods for multiInput for sarch field for scan functionality start*/
		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {
					orFilter.push(new sap.ui.model.Filter("BatchNum", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("U_NSTNM", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("ItemName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("MnfSerial", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("WhsName", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("WhsCode", "Contains", value.toLowerCase()));
					orFilter.push(new sap.ui.model.Filter("IntrSerial", "Contains", value.toLowerCase()));
					andFilter.push(new sap.ui.model.Filter({
						filters: orFilter,
						and: false,
						caseSensitive: false
					}));
				}
			});
			this.byId("microPropagationTable").getBinding("rows").filter(andFilter);
		},
		renderComplete: function (evt) {
			if (evt.getSource().getParent().getParent().getFullScreen() === false) {
				evt.getSource().setHeight("8rem");
			}
		},
		onRefreshChart: function () {
			this.byId("microPropagationTable").setSelectedIndex(-1);
		},

		onCloseRefreshChart: function () {
			this.byId("searchFieldTable4").setText("");
			this.byId("searchFieldTable3").setVisible(false);
			var cloneTable = this.byId("microPropagationTable");
			// var cloneList = this.byId("oList");
			cloneTable.getBinding("rows").filter([]);
			//cloneList.getBinding("items").filter([]);
		},
		clearData: function () {
			this.byId("microPropagationTable").clearSelection();
		},
		onPlantsRefresh: function () {
			this.clearAllFilters();
			this.onCloseRefreshChart();
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
			this.loadStrainData();
		},
		handleRowSelection: function () {
			var sItems;
			var table = this.getView().byId("microPropagationTable");
			sItems = table.getSelectedIndices();
		}

	});
});