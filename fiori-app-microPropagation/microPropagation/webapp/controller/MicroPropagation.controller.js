sap.ui.define([
	"com/9b/PhenoTrack/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/PhenoTrack/model/models",
	"sap/ndc/BarcodeScanner",
	"sap/ui/core/format/DateFormat"
], function (BaseController, Fragment, Filter, FilterOperator, model, BarcodeScanner, DateFormat) {
	"use strict";

	return BaseController.extend("com.9b.PhenoTrack.controller.MicroPropagation", {
		formatter: model,

		onInit: function () {
			this.getAppConfigData();
			var clonePlannerTable = this.getView().byId("clonePlannerTable");
			var tableHeader = this.byId("tableHeader");
			clonePlannerTable.addEventDelegate({
				onAfterRendering: function () {
					var oBinding = this.getBinding("rows");
					oBinding.attachChange(function (oEvent) {
						var oSource = oEvent.getSource();
						var count = oSource.iLength; //Will fetch you the filtered rows length
						var totalCount = oSource.oList.length;
						tableHeader.setText("Plants (" + count + "/" + totalCount + ")");
					});
				}
			}, clonePlannerTable);
			this.combinedFilter = [];
			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
		},

		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "PhenoTrack") {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				sap.ui.core.BusyIndicator.hide();
				this.getView().byId("clonePlannerTable").clearSelection();
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
				that.loadItems();
			}, this.getView());
		},
		loadItems: function () {
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

			var filters2 = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and ItemsGroupCode eq 122";
			var fields2 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters2 + fields2, function (data1) {
				jsonModel.setProperty("/seedlingItemCodeList", data1.value);
			});

			var filters4 = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and ItemsGroupCode eq 110";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data3) {
				jsonModel.setProperty("/cannabisItemCodeList", data3.value);
			});

			var filters4 = "?$filter=U_NLFID eq " + "'" + licenseNo + "' and ItemsGroupCode eq 109";
			var fields4 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters4 + fields4, function (data3) {
				jsonModel.setProperty("/cloneItemCodeList", data3.value);
			});
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
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo +
					"'  and Quantity ne 0 and (U_Phase eq 'Seedling' or U_Phase eq 'PhenoSVeg' or U_Phase eq 'PhenoMom') ";
			} else if (selTab == "MPROPAGATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo +
					"'  and Quantity ne 0 and (U_Phase eq 'Cutting') ";
			} else if (selTab == "PROPAGATION") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo +
					"'  and Quantity ne 0 and (U_Phase eq 'PhenoClone' or U_Phase eq 'PhenoCVeg' or U_Phase eq 'PhenoFlower') ";
			} else if (selTab == "PACKAGING") {
				filters = "?$filter=U_MetrcLicense eq " + "'" + licenseNo +
					"'  and Quantity ne 0 and U_Phase eq 'PhenoPack' ";
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

				var strainDetails = jsonModel.getProperty("/strainList");
				$.each(data.value, function (i, e) {
					var returnObj = $.grep(strainDetails, function (ele) {
						if (e.U_NSTNM === ele.U_NSTNM) {
							return ele;
						}
					});
					if (returnObj.length > 0) {
						var cTime = e.CreateDate;
						var date1 = new Date(cTime.replace("Z", ""));
						var pTime;
						if (e.MnfSerial == "SEEDS") {
							pTime = Number(returnObj[0].U_NPSVG);
						} else {
							pTime = Number(returnObj[0].U_NPKMG);
						}
						var myDate = new Date(date1.getTime() + (pTime * 24 * 60 * 60 * 1000));
						var year = myDate.getFullYear();
						var month = (1 + myDate.getMonth()).toString();
						month = month.length > 1 ? month : "0" + month;
						var day = myDate.getDate().toString();
						day = day.length > 1 ? day : "0" + day;
						e.transplantDate = year + "-" + month + "-" + day;
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
				jsonModel.setProperty("/cloneTableDataNew", data.value);
				this.byId("tableHeader").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader1").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader2").setText("Plants (" + data.value.length + ")");
				this.byId("tableHeader3").setText("Plants (" + data.value.length + ")");
			}, this.getView());
		},

		/** Method for clear all filters**/
		clearAllFilters: function () {
			this.onCloseRefreshChart();
			var filterTable = this.getView().byId("clonePlannerTable");
			var aColumns = filterTable.getColumns();
			for (var i = 0; i <= aColumns.length; i++) {
				filterTable.filter(aColumns[i], null);
				filterTable.sort(aColumns[i], null);
			}
			this.byId("searchFieldTable").removeAllTokens();
			this.byId("searchFieldTable1").removeAllTokens();
			this.byId("searchFieldTable2").removeAllTokens();
		},

		/*code for create Seedling functionality start*/
		createSeedling: function () {
			if (!this.createSeedlingDialog) {
				this.createSeedlingDialog = sap.ui.xmlfragment("CloneSeedlingDialog", "com.9b.PhenoTrack.view.fragments.CreateSeedling", this);
				this.getView().addDependent(this.createSeedlingDialog);
			}
			this.clearCreateSeedlingData();
			this.createSeedlingDialog.open();
			this.loadAllCloneData();
		},
		clearCreateSeedlingData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var cCloneObj = {
				sStrain: "",
				sBatch: "",
				avlQty: "",
				sQty: "",
				sDate: new Date(),
				sLocation: ""
			};
			jsonModel.setProperty("/cCloneData", cCloneObj);
		},
		loadAllCloneData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters1 = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and U_Phase ne 'Seed' ";
			var cSelect1 = "&$select=BatchNum,IntrSerial";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters1 + cSelect1, function (data) {
				jsonModel.setProperty("/allCloneData", data.value);
			});

			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters1 = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and U_Phase eq 'PhenoPack' ";
			var cSelect1 = "&$select=BatchNum,IntrSerial";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters1 + cSelect1, function (data) {
				jsonModel.setProperty("/allPackageData", data.value);
			});

			var filters = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") +
				"' and Quantity ne 0  and U_Phase eq 'PhenoMom'";
			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters, function (itemData) {
				$.each(itemData.value, function (i, e1) {
					var itemName = e1.ItemName;
					e1.strainValue = itemName.split(" - ")[0];
				});
				jsonModel.setProperty("/motherPlantData", itemData.value);
			});
		},
		onChangeQuantity: function (evt) {
			var value = evt.getParameter("newValue");
			value = value.replace(/[^.\d]/g, '').replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2");
			evt.getSource().setValue(value);
			var avlQty = sap.ui.core.Fragment.byId("CloneSeedlingDialog", "avlQty").getValue();
			if (Number(value) === 0) {
				evt.getSource().setValueState("Error");
				evt.getSource().setValueStateText("Invalid quantity");
				evt.getSource().focus();
			} else if (Number(value) > Number(avlQty)) {
				evt.getSource().setValueState("Error");
				evt.getSource().setValueStateText("Entered Quantity should be less than " + avlQty);
				//evt.getSource().setValue(value.slice(0, value.length - 1));
				evt.getSource().focus();
			} else {
				evt.getSource().setValueState("None");
			}
		},
		onChangeBatch: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sObj = evt.getParameter("selectedItem").getBindingContext("jsonModel").getObject();
			var availableQuantity = sObj.Quantity;
			sap.ui.core.Fragment.byId("CloneSeedlingDialog", "avlQty").setValue(availableQuantity);
		},
		onChangeStrain: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sStrain = sap.ui.core.Fragment.byId("CloneSeedlingDialog", "strain").getSelectedKey();
			var filters = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") +
				"' and Quantity ne 0 and U_Phase eq 'Seed' and contains(ItemName,'" + sStrain + "')";

			this.readServiecLayer("/b1s/v2/sml.svc/CV_PLANNER_VW" + filters, function (data) {
				jsonModel.setProperty("/allBatchData", data.value);
			});
		},
		onSeedlingClose: function () {
			this.createSeedlingDialog.close();
		},
		onSeedlingCreate: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			var cCloneData = jsonModel.getProperty("/cCloneData");
			var date = jsonModel.getProperty("/cCloneData/sDate");
			var selObj, createdate, strainName, locationID, strain, strainCode;
			var sStrain = sap.ui.core.Fragment.byId("CloneSeedlingDialog", "strain");
			strain = sStrain.getSelectedKey();
			var BatchName = sap.ui.core.Fragment.byId("CloneSeedlingDialog", "batch").getSelectedKey();
			var createSeedlingsList = jsonModel.getProperty("/createSeedlings");
			locationID = createSeedlingsList[0].key;
			if (strain === "") {
				sap.m.MessageToast.show("Please select Strain");
				return;
			}
			if (BatchName === "") {
				sap.m.MessageToast.show("Please select Batch");
				return;
			}
			selObj = sStrain.getSelectedItem().getBindingContext("jsonModel").getObject();
			strainName = selObj.U_NSTNM;
			strainCode = strainName.split(":")[0];

			var valueState = sap.ui.core.Fragment.byId("CloneSeedlingDialog", "eQty").getValueState();

			if (valueState === "Error") {
				sap.ui.core.Fragment.byId("CloneSeedlingDialog", "eQty").focus();
				return;
			}
			createdate = cCloneData.sDate;
			var quantity = Number(cCloneData.sQty);
			if (quantity === "" || quantity === 0) {
				sap.m.MessageToast.show("Please enter quantity");
				return;
			}
			if (isNaN(quantity)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			}
			if (date === " " || date === null || date === undefined) {
				sap.m.MessageToast.show("Please select Date");
				return;
			}
			var cloneData = jsonModel.getProperty("/allCloneData");
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(date);

			var d = new Date();
			var month = '' + (d.getMonth() + 1);
			var day = '' + d.getDate();
			var year = d.getFullYear();
			var uniqueText = year + "" + month + "" + day;

			//get the itemcode form items url based on strainname and itemgroupcode
			var batchUrl = [];
			var itemArray = [],
				ItemCode;
			var plantID, batchID;
			var seedlingItemCodeList = jsonModel.getProperty("/seedlingItemCodeList");
			$.each(seedlingItemCodeList, function (i, e) {
				if (e.ItemName === strainName + " - " + "Seedling") {
					itemArray.push(e);
				}
			});
			if (itemArray.length > 0) {
				ItemCode = itemArray[0].ItemCode;
			}

			//inventory entry to seedling item
			var payLoadInventoryEntry = {
				"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
				"DocDate": createdDate,
				"DocDueDate": createdDate,
				"DocumentLines": [{
					"ItemCode": ItemCode,
					"WarehouseCode": locationID,
					"Quantity": quantity,
					"BatchNumbers": []
				}]
			};
			batchID = that.generateCloneBatchID(uniqueText, strainCode, cloneData);
			//return;
			$.each(new Array(quantity), function (i, e) {
				plantID = that.generateClonePlantID(uniqueText, strainCode, cloneData);
				payLoadInventoryEntry.DocumentLines[0].BatchNumbers.push({
					"BatchNumber": plantID,
					"Quantity": 1,
					"Location": locationID,
					"U_Phase": "Seedling",
					"ManufacturerSerialNumber": BatchName,
					"InternalSerialNumber": batchID,
				});
			});
			batchUrl.push({
				url: "/b1s/v2/InventoryGenEntries",
				data: payLoadInventoryEntry,
				method: "POST"
			});

			//inventory exit to seed item
			var sBatch = sap.ui.core.Fragment.byId("CloneSeedlingDialog", "batch");
			var sObj = sBatch.getSelectedItem().getBindingContext("jsonModel").getObject();
			var payLoadInventoryExits = {
				"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
				"DocumentLines": []
			};
			payLoadInventoryExits.DocumentLines.push({
				"ItemCode": sObj.ItemCode,
				"WarehouseCode": sObj.WhsCode,
				"Quantity": quantity,
				"CostingCode": "CUL",
				"BatchNumbers": [{
					"BatchNumber": sObj.BatchNum,
					"Quantity": quantity,
					"Location": sObj.WhsCode
				}]
			});
			batchUrl.push({
				url: "/b1s/v2/InventoryGenExits",
				data: payLoadInventoryExits,
				method: "POST"
			});

			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Seedling created successfully");
				}
				that.createSeedlingDialog.close();
				that.createSeedlingDialog.setBusy(false);
				that.loadStrainData();
			}, this.createSeedlingDialog);
		},
		/*code for clone create functionality end*/

		/***method start for change growth phase***/
		changeGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("clonePlannerTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Cannabis Plant") == -1) {
					if (!this.changeGrowthPhaseDialog) {
						this.changeGrowthPhaseDialog = sap.ui.xmlfragment("changeGrowthPhaseDialog",
							"com.9b.PhenoTrack.view.fragments.ChangeGrowthPhase", this);
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
			var table = this.getView().byId("clonePlannerTable");
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
				that.byId("clonePlannerTable").setSelectedIndex(-1);
			}, this.changeGrowthPhaseDialog);
		},
		/***method end for change growth phase***/

		/*code for mark as propagation start*/
		markAsPropagation: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var markAsMotherList = jsonModel.getProperty("/markAsMotherList");
			var locationID = markAsMotherList[0].key;
			var sItems;
			var updateObject;
			var phenoTracktable = this.getView().byId("clonePlannerTable");
			sItems = phenoTracktable.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = phenoTracktable.getContextByIndex(sItems[0]).getObject();
				if (updateObject.U_Phase === "PhenoMom") {
					sap.m.MessageToast.show("These plants are already in pheno mother phase");
					return;
				}

				if (updateObject.ItemName.search("Cannabis Plant") !== -1) {
					sap.m.MessageBox.confirm("Are you sure you want to mark them as Pheno mother ?", {
						onClose: function (action) {
							if (action === "OK") {
								//phase change to mother
								var sObj, payLoadInventory, batchUrl = [],
									invTrasData = [],
									payLoadUpdate;
								$.each(sItems, function (i, e) {
									payLoadInventory = {};
									sObj = phenoTracktable.getContextByIndex(e).getObject();
									var payLoadInventoryEntry = {
										U_Phase: "PhenoMom"
									};
									batchUrl.push({
										url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
										data: payLoadInventoryEntry,
										method: "PATCH"
									});
								});

								$.each(sItems, function (i, e) {
									var payLoadInventoryNew = {};
									sObj = phenoTracktable.getContextByIndex(e).getObject();
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
											payLoadInventoryNew = {
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
											invTrasData.push(payLoadInventoryNew);
										}
									} else {
										payLoadInventoryNew = {
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
										invTrasData.push(payLoadInventoryNew);
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
								that.createBatchCall(batchUrl, function () {
									var errorTxt = jsonModel.getProperty("/errorTxt");
									if (errorTxt.length > 0) {
										sap.m.MessageBox.error(errorTxt.join("\n"));
									} else {
										sap.m.MessageToast.show("Selected plants are marked as mother");
									}
									that.loadStrainData();
									phenoTracktable.setSelectedIndex(-1);
								});
							}
						}
					});
				} else {
					sap.m.MessageToast.show("Please select Cannabis plant");
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		/*code for mark as propagation end*/

		/*code for clone create functionality start*/
		createClone: function () {
			if (!this.createCloneDialog) {
				this.createCloneDialog = sap.ui.xmlfragment("CloneCreateDialog", "com.9b.PhenoTrack.view.fragments.CreateClone", this);
				this.getView().addDependent(this.createCloneDialog);
			}
			this.clearCreateCloneData();
			this.createCloneDialog.open();
			this.loadAllCloneData();
		},
		clearCreateCloneData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sCloneObj = {
				sCloneType: "MO",
				sMotherPlant: "",
				sDate: new Date(),
				sLocation: "",
				sQty: "",
				sStrain: ""
			};
			jsonModel.setProperty("/sCloneData", sCloneObj);
		},
		onCloneClose: function () {
			this.createCloneDialog.close();
		},
		onCloneCreate: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			var sCloneData = jsonModel.getProperty("/sCloneData");
			var date = jsonModel.getProperty("/sCloneData/sDate");
			var cloneType, sPlant, selObj, createdate, qty, strainName, locationID, locationName, idType, sourceName, sStrain, strain,
				strainCode;

			var mPlant = sap.ui.core.Fragment.byId("CloneCreateDialog", "mPlant");
			sPlant = mPlant.getSelectedKey();
			if (sPlant === "") {
				sap.m.MessageToast.show("Please select Mother Plant");
				return;
			} else {
				selObj = mPlant.getSelectedItem().getBindingContext("jsonModel").getObject();
				var itemName = selObj.ItemName;
				strainName = itemName.split(" - ")[0];
				var strainCodeName = selObj.BatchNum;
				strainCode = strainCodeName.split("-")[1];
			}
			cloneType = sPlant;

			var valueState = sap.ui.core.Fragment.byId("CloneCreateDialog", "eQty").getValueState();
			if (valueState === "Error") {
				sap.ui.core.Fragment.byId("CloneCreateDialog", "eQty").focus();
				return;
			}
			createdate = sCloneData.sDate;
			qty = Number(sCloneData.sQty);
			locationID = sap.ui.core.Fragment.byId("CloneCreateDialog", "location").getSelectedKey();

			if (qty === "" || qty === 0) {
				sap.m.MessageToast.show("Please enter quantity");
				return;
			}
			if (isNaN(qty)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			}
			if (date === " " || date === null || date === undefined) {
				sap.m.MessageToast.show("Please select Date");
				return;
			}
			if (locationID === "") {
				sap.m.MessageToast.show("Please select Location");
				return;
			}
			var cloneData = jsonModel.getProperty("/allCloneData");
			var cDate;
			if (createdate !== null) {
				cDate = this.convertUTCDateTime(createdate);
			} else {
				cDate = this.convertUTCDateTime(new Date());
			}
			var d = new Date();
			var month = '' + (d.getMonth() + 1);
			var day = '' + d.getDate();
			var year = d.getFullYear();
			var uniqueText = year + "" + month + "" + day;

			//get the itemcode form items url based on strainname and itemgroupcode
			var itemArray = [],
				ItemCode;
			var cloneItemCodeList = jsonModel.getProperty("/cloneItemCodeList");
			$.each(cloneItemCodeList, function (i, e) {
				if (e.ItemName === strainName + " - " + "Clone") {
					itemArray.push(e);
				}
			});
			if (itemArray.length > 0) {
				ItemCode = itemArray[0].ItemCode;
			}
			var quantity = qty;
			var payLoadInventoryEntry = {
				"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
				"DocumentLines": [{
					"ItemCode": ItemCode,
					"WarehouseCode": locationID,
					"Quantity": quantity,
					"BatchNumbers": []
				}]
			};

			var plantID;
			var batchUrl = [];
			var batchID = that.generateCloneBatchID(uniqueText, strainCode, cloneData);
			$.each(new Array(qty), function (i, e) {
				plantID = that.generateClonePlantID(uniqueText, strainCode, cloneData);
				payLoadInventoryEntry.DocumentLines[0].BatchNumbers.push({
					"BatchNumber": plantID,
					"Quantity": 1,
					"Location": locationID,
					"U_Phase": "Cutting",
					"ManufacturerSerialNumber": cloneType,
					"InternalSerialNumber": batchID,
				});
			});
			batchUrl.push({
				url: "/b1s/v2/InventoryGenEntries",
				data: payLoadInventoryEntry,
				method: "POST"
			});
			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Cuttings created successfully");
				}
				that.createCloneDialog.close();
				that.createCloneDialog.setBusy(false);
				that.loadStrainData();
			}, this.createCloneDialog);
		},
		/*code for clone create functionality end*/

		createCuttings: function () {

			var sItems;
			var updateObject;
			var phenoTracktable = this.getView().byId("clonePlannerTable");
			sItems = phenoTracktable.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = phenoTracktable.getContextByIndex(sItems[0]).getObject();
			}
			if (!this.createCuttingsDialog) {
				this.createCuttingsDialog = sap.ui.xmlfragment("createCuttingsDialog", "com.9b.PhenoTrack.view.fragments.CreateCuttings", this);
				this.getView().addDependent(this.createCuttingsDialog);
			}
			this.clearCreateCloneData1();
			this.createCuttingsDialog.open();
			this.loadAllCloneData();
			sap.ui.core.Fragment.byId("createCuttingsDialog", "batchID").setValue(updateObject.BatchNum + "  -  " + updateObject.IntrSerial);
		},
		clearCreateCloneData1: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sCloneObj = {
				sCloneType: "MO",
				sMotherPlant: "",
				sDate: new Date(),
				sLocation: "",
				sQty: "",
				sStrain: ""
			};
			jsonModel.setProperty("/sCloneData", sCloneObj);
		},
		onCuttingsClose: function () {
			this.createCuttingsDialog.close();
		},
		onCuttingsCreate: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			var sCloneData = jsonModel.getProperty("/sCloneData");
			var date = jsonModel.getProperty("/sCloneData/sDate");
			var cloneType, sPlant, selObj, createdate, qty, strainName, locationID, locationName, idType, sourceName, sStrain, strain,
				strainCode;

			//var mPlant = sap.ui.core.Fragment.byId("createCuttingsDialog", "mPlant");
			//sPlant = mPlant.getSelectedKey();
			selObj = mPlant.getSelectedItem().getBindingContext("jsonModel").getObject();
			var itemName = selObj.ItemName;
			strainName = itemName.split(" - ")[0];
			var strainCodeName = selObj.BatchNum;
			strainCode = strainCodeName.split("-")[1];

			cloneType = sPlant;

			var valueState = sap.ui.core.Fragment.byId("createCuttingsDialog", "eQty").getValueState();
			if (valueState === "Error") {
				sap.ui.core.Fragment.byId("createCuttingsDialog", "eQty").focus();
				return;
			}
			createdate = sCloneData.sDate;
			qty = Number(sCloneData.sQty);
			locationID = sap.ui.core.Fragment.byId("createCuttingsDialog", "location").getSelectedKey();

			if (qty === "" || qty === 0) {
				sap.m.MessageToast.show("Please enter quantity");
				return;
			}
			if (isNaN(qty)) {
				sap.m.MessageToast.show("Please enter numeric value only");
				return;
			}
			if (date === " " || date === null || date === undefined) {
				sap.m.MessageToast.show("Please select Date");
				return;
			}
			if (locationID === "") {
				sap.m.MessageToast.show("Please select Location");
				return;
			}
			var cloneData = jsonModel.getProperty("/allCloneData");
			var cDate;
			if (createdate !== null) {
				cDate = this.convertUTCDateTime(createdate);
			} else {
				cDate = this.convertUTCDateTime(new Date());
			}
			var d = new Date();
			var month = '' + (d.getMonth() + 1);
			var day = '' + d.getDate();
			var year = d.getFullYear();
			var uniqueText = year + "" + month + "" + day;

			//get the itemcode form items url based on strainname and itemgroupcode
			var itemArray = [],
				ItemCode;
			var cloneItemCodeList = jsonModel.getProperty("/cloneItemCodeList");
			$.each(cloneItemCodeList, function (i, e) {
				if (e.ItemName === strainName + " - " + "Clone") {
					itemArray.push(e);
				}
			});
			if (itemArray.length > 0) {
				ItemCode = itemArray[0].ItemCode;
			}
			var quantity = qty;
			var payLoadInventoryEntry = {
				"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
				"DocumentLines": [{
					"ItemCode": ItemCode,
					"WarehouseCode": locationID,
					"Quantity": quantity,
					"BatchNumbers": []
				}]
			};

			var plantID;
			var batchUrl = [];
			var batchID = that.generateCloneBatchID(uniqueText, strainCode, cloneData);
			$.each(new Array(qty), function (i, e) {
				plantID = that.generateClonePlantID(uniqueText, strainCode, cloneData);
				payLoadInventoryEntry.DocumentLines[0].BatchNumbers.push({
					"BatchNumber": plantID,
					"Quantity": 1,
					"Location": locationID,
					"U_Phase": "Cutting",
					"ManufacturerSerialNumber": cloneType,
					"InternalSerialNumber": batchID,
				});
			});
			batchUrl.push({
				url: "/b1s/v2/InventoryGenEntries",
				data: payLoadInventoryEntry,
				method: "POST"
			});
			//return;
			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Cuttings created successfully");
				}
				that.createCloneDialog.close();
				that.createCloneDialog.setBusy(false);
				that.loadStrainData();
			}, this.createCloneDialog);
		},

		/*code for harvest functionality start*/
		onHarvest: function (evt) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			if (!this.bulkHarvestDialog) {
				this.bulkHarvestDialog = sap.ui.xmlfragment("harvestB", "com.9b.PhenoTrack.view.fragments.Harvest", this);
				this.getView().addDependent(this.bulkHarvestDialog);
			}
			this.clearBulkHarvestData();
			this.loadAllCloneData();
			this.bulkHarvestDialog.open();

			var filters2 = "?$filter=U_NLFID eq " + "'" + jsonModel.getProperty("/selectedLicense") + "' and ItemsGroupCode eq 112";
			var fields2 = "&$select=" + ["ItemName", "ItemsGroupCode", "ItemCode", "U_NLFID"].join();
			this.readServiecLayer("/b1s/v2/Items" + filters2 + fields2, function (data) {
				jsonModel.setProperty("/itemList", data.value);
			});
		},
		clearBulkHarvestData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var bulkHarvestObj = {
				avPlants: "",
				NoOfPlants: "",
				harvestItem: "",
				enteredHarvest: "",
				wetWight: "",
				fWetWt: "",
				harvestRoom: ""
			};
			jsonModel.setProperty("/showMessagePage", true);
			sap.ui.core.Fragment.byId("harvestB", "barcode").focus();
			sap.ui.core.Fragment.byId("harvestB", "barcode").setValue();
			jsonModel.setProperty("/bulkHarvestObj", bulkHarvestObj);
			jsonModel.setProperty("/scanTextHarvest", "Scan or Enter Harvest Name");
			jsonModel.setProperty("/scannedBatchPlants", []);
		},
		onWtChange: function (evt) {
			var value = evt.getParameter("newValue");
			value = value.replace(/[^.\d]/g, '').replace(/^(\d*\.?)|(\d*)\.?/g, "$1$2");
			evt.getSource().setValue(value);
		},
		bulkHarvestTagScan: function (evt) {
			var that = this;
			var selectedLocation;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/BulkitemUnique", true);
			var serLayerbaseUrl = jsonModel.getProperty("/serLayerbaseUrl");
			var packageData = jsonModel.getProperty("/allPackageData");

			var barCodeInput = evt.getSource();
			var value = barCodeInput.getValue();
			if (value === "") {
				jsonModel.setProperty("/scanTextHarvest", "Scan or Enter Harvest Name");
			} else {
				var selTab = this.byId("phenoTab").getSelectedKey();
				var filters;
				if (selTab == "VEGETATION") {
					filters = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") +
						"'  and Quantity ne 0 and U_Phase eq 'PhenoMom'  and IntrSerial eq '" + value + "'";
				} else if (selTab == "PROPAGATION") {
					filters = "?$filter=U_MetrcLicense eq " + "'" + jsonModel.getProperty("/selectedLicense") +
						"'  and Quantity ne 0 and U_Phase eq 'PhenoFlower'  and IntrSerial eq '" + value + "'";
				}

				jsonModel.setProperty("/showBusy", true);
				var sURL;
				if (location.host.indexOf("webide") !== -1) {
					sURL = serLayerbaseUrl + "/b1s/v2/sml.svc/CV_PLANNER_VW" + filters;
				} else {
					sURL = "/b1s/v2/sml.svc/CV_PLANNER_VW" + filters;
				}
				$.ajax({
					type: "GET",
					xhrFields: {
						withCredentials: true
					},
					url: sURL,
					setCookies: "B1SESSION=" + jsonModel.getProperty("/sessionID"),
					dataType: "json",
					success: function (res) {
						if (res.value.length > 0) {
							var d = new Date();
							var month = '' + (d.getMonth() + 1);
							var day = '' + d.getDate();
							var year = d.getFullYear();
							var uniqueText = year + "" + month + "" + day;
							var bTagValue = res.value[0].ItemName;
							var itemValue = bTagValue.split(" - ")[0];
							var strainCode = itemValue.split(":")[0];
							var packageID = that.generatePackageBatchID(uniqueText, strainCode, packageData);
							var sLocation = res.value[0].WhsCode + " - " + res.value[0].WhsName;
							jsonModel.setProperty("/bulkHarvestObj/harvestRoom", sLocation);
							jsonModel.setProperty("/scannedHarvest", res.value[0].IntrSerial);
							jsonModel.setProperty("/scannedTag", res.value[0]);
							jsonModel.setProperty("/scannedBatchPlants", res.value);
							jsonModel.setProperty("/bulkHarvestObj/enteredHarvest", packageID);
							jsonModel.setProperty("/bulkHarvestObj/avPlants", res.value.length);

							sap.ui.core.Fragment.byId("harvestB", "harvstItem").getBinding("items").filter(new Filter("ItemName", "Contains", itemValue));

							var differentItem = [];
							$.each(res.value, function (i, m) {
								if (res.value[0].ItemCode != m.ItemCode) {
									differentItem.push({
										"item": m.StrainName
									});
									if (res.value.length == i + 1) {
										differentItem.push({
											"item": res.value[0].StrainName
										});
									}
									jsonModel.setProperty("/BulkitemUnique", false);
								}
							});
							if (jsonModel.getProperty("/BulkitemUnique") == false) {
								var message;
								$.each(differentItem, function (i, n) {
									if (differentItem.length == i + 1) {
										message += n.item;
									} else {
										message += n.item + " , ";
									}
								});
								sap.m.MessageBox.error("Multiple strains available for selected Harvest Batch Name : " + message.split("undefined")[1]);
							} else {
								jsonModel.setProperty("/showMessagePage", false);
							}
						} else {
							jsonModel.setProperty("/showMessagePage", true);
							jsonModel.setProperty("/scanTextHarvest", "Invalid Batch Name");
						}
						jsonModel.setProperty("/showBusy", false);
					},
					error: function (error) {}
				});
			}
		},
		onHarvestClose: function () {
			this.bulkHarvestDialog.close();
		},
		postBulkHarvestData: function () {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var licenseNo = jsonModel.getProperty("/selectedLicense");
			var bulkHarvestObj = jsonModel.getProperty("/bulkHarvestObj");
			var locationValue = sap.ui.core.Fragment.byId("harvestB", "sRoom").getValue();
			var locationID = locationValue.split(" - ")[0];
			var itemCode = sap.ui.core.Fragment.byId("harvestB", "harvstItem").getSelectedKey();
			var avPlants = bulkHarvestObj.avPlants
			var enteredHarvest = bulkHarvestObj.enteredHarvest;
			var netWeight = bulkHarvestObj.fWetWt;
			if (enteredHarvest === "") {
				sap.m.MessageToast.show("Please enter Harvest Name");
				return;
			} else if (netWeight <= "0" || netWeight <= 0) {
				sap.m.MessageToast.show("Net weigth must be greater than 0");
				return;
			}
			var itemObj = jsonModel.getProperty("/scannedTag");
			var sLicence = jsonModel.getProperty("/sLinObj/U_MetrcLicense");
			jsonModel.setProperty("/busyView", true);
			sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(false);

			var batchUrl = [];
			jsonModel.setProperty("/errorTxt", []);
			var scannedBatchPlants = jsonModel.getProperty("/scannedBatchPlants");
			$.grep(scannedBatchPlants, function (plant, sIndex) {
				var harvestCout = Number(plant.U_HarvestBatch);
				var payLoadInventoryEntry = {
					U_HarvestBatch: harvestCout + 1
				};
				batchUrl.push({
					url: "/b1s/v2/BatchNumberDetails(" + plant.AbsEntry + ")",
					data: payLoadInventoryEntry,
					method: "PATCH"
				});
			});

			//entry to package tab
			var payLoadInventory = {
				"BPL_IDAssignedToInvoice": jsonModel.getProperty("/sLinObj").U_NBRCD,
				"DocumentLines": []
			};
			payLoadInventory.DocumentLines.push({
				"ItemCode": itemCode,
				"WarehouseCode": locationID,
				"Quantity": netWeight,
				"BatchNumbers": [{
					"BatchNumber": enteredHarvest,
					"Quantity": netWeight,
					"Location": locationID,
					"U_Phase": "PhenoPack",
					"ManufacturerSerialNumber": itemObj.IntrSerial, //source UID
					//"InternalSerialNumber": itemObj.MnfSerial //harvest name
				}],
			});
			batchUrl.push({
				url: "/b1s/v2/InventoryGenEntries",
				data: payLoadInventory,
				method: "POST"
			});

			jsonModel.setProperty("/busyView", true);
			that.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Plant Status Changed Successfully");
				}
				jsonModel.setProperty("/busyView", false);
				that.bulkHarvestDialog.close();
				sap.ui.core.Fragment.byId("harvestB", "seachBtn").setEnabled(true);
				that.clearBulkHarvestData();
				that.loadMasterData();
				that.byId("clonePlannerTable").setSelectedIndex(-1);
				jsonModel.setProperty("/scanTextHarvest", "Scan or Enter Harvest Name");
			});
		},
		/*code for harvest functionality end*/

		/*method for destroy the plants start*/
		performDestroyPlants: function () {
			var that = this;
			var sItems;
			var table = this.getView().byId("clonePlannerTable");
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
					this.confirmDestroyDialog = sap.ui.xmlfragment("ConfirmDestroyPlant", "com.9b.PhenoTrack.view.fragments.DestroyPlant",
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
			var table = this.getView().byId("clonePlannerTable");
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
					that.byId("clonePlannerTable").setSelectedIndex(-1);
					that.confirmDestroyDialog.close();
					that.loadStrainData();
				}, this.confirmDestroyDialog);
			} else {
				sap.m.MessageToast.show("Please select atleast one record");
			}
		},
		/*method for destroy the plants end*/

		/*method for mark as mother start*/
		markAsMother: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var markAsMotherList = jsonModel.getProperty("/markAsMotherList");
			var locationID = markAsMotherList[0].key;
			var sItems;
			var updateObject;
			var phenoTracktable = this.getView().byId("clonePlannerTable");
			sItems = phenoTracktable.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = phenoTracktable.getContextByIndex(sItems[0]).getObject();
				if (updateObject.ItemName.search("Cannabis Plant") !== -1) {
					sap.m.MessageBox.confirm("Are you sure you want to mark them as mother ?", {
						onClose: function (action) {
							if (action === "OK") {
								//phase change to mother
								var sObj, payLoadInventory, batchUrl = [],
									invTrasData = [],
									payLoadUpdate;
								$.each(sItems, function (i, e) {
									payLoadInventory = {};
									sObj = phenoTracktable.getContextByIndex(e).getObject();
									var payLoadInventoryEntry = {
										U_Phase: "Mother"
									};
									batchUrl.push({
										url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
										data: payLoadInventoryEntry,
										method: "PATCH"
									});
								});

								$.each(sItems, function (i, e) {
									var payLoadInventoryNew = {};
									sObj = phenoTracktable.getContextByIndex(e).getObject();
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
											payLoadInventoryNew = {
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
											invTrasData.push(payLoadInventoryNew);
										}
									} else {
										payLoadInventoryNew = {
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
										invTrasData.push(payLoadInventoryNew);
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
								that.createBatchCall(batchUrl, function () {
									var errorTxt = jsonModel.getProperty("/errorTxt");
									if (errorTxt.length > 0) {
										sap.m.MessageBox.error(errorTxt.join("\n"));
									} else {
										sap.m.MessageToast.show("Selected plants are marked as mother");
									}
									that.loadStrainData();
									phenoTracktable.setSelectedIndex(-1);
								});
							}
						}
					});
				} else {
					sap.m.MessageToast.show("Please select Cannabis plant");
				}
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		/*method for mark as mother start*/

		/*method for change growth phase in propagation tab start*/
		cloneChangeGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sItems, that = this;
			var updateObject;
			var table = this.getView().byId("clonePlannerTable");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (updateObject.U_Phase === "PhenoFlower") {
					sap.m.MessageToast.show("You can not change growth phase of flower plants");
					return;
				}

				if (!this.CloneChangeGrowthPhaseDialog) {
					this.CloneChangeGrowthPhaseDialog = sap.ui.xmlfragment("CloneChangeGrowthPhaseDialog",
						"com.9b.PhenoTrack.view.fragments.CloneChangeGrowthPhase", this);
					this.getView().addDependent(this.CloneChangeGrowthPhaseDialog);
				}
				if (updateObject.ItemName.search("Clone") !== -1) {
					jsonModel.setProperty("/cgPhase", "Vegetative");
				}
				if (updateObject.ItemName.search("Cannabis Plant") !== -1) {
					jsonModel.setProperty("/cgPhase", "Flower");
				}
				sap.ui.core.Fragment.byId("CloneChangeGrowthPhaseDialog", "avalQty").setValue(sItems.length);
				sap.ui.core.Fragment.byId("CloneChangeGrowthPhaseDialog", "location").setSelectedKey("");
				sap.ui.core.Fragment.byId("CloneChangeGrowthPhaseDialog", "mDate").setDateValue(new Date());
				this.CloneChangeGrowthPhaseDialog.open();
				this.loadAllCloneData();
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},
		cloneChangeGrowthPhaseClose: function () {
			this.CloneChangeGrowthPhaseDialog.close();
		},
		cloneChageGrowthPhase: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var table = this.getView().byId("clonePlannerTable");
			var vRoom = sap.ui.core.Fragment.byId("CloneChangeGrowthPhaseDialog", "growthPhase").getSelectedKey();
			var locationID = sap.ui.core.Fragment.byId("CloneChangeGrowthPhaseDialog", "location").getSelectedKey();
			var createDate = sap.ui.core.Fragment.byId("CloneChangeGrowthPhaseDialog", "mDate").getDateValue();
			var dateFormat = DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd"
			});
			var createdDate = dateFormat.format(createDate);
			var that = this;
			var sItems;
			sItems = table.getSelectedIndices();
			var count = sItems.length;
			if (sItems.length == 0) {
				sap.m.MessageToast.show("Please select atleast one plant");
				return;
			}
			var batchUrl = [],
				sObj;
			var changePhase = jsonModel.getProperty("/cgPhase");
			if (changePhase == "Vegetative") {
				if (locationID === "") {
					sap.m.MessageToast.show("Please select Location");
					return;
				}
				//inventory entry to seedling item
				var cannabisItemCodeList = jsonModel.getProperty("/cannabisItemCodeList");
				var cannabisItemArray = [],
					invTraDesDataEntry = [];

				var payLoadInventory, cannabisItemCode;
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
									"U_Phase": "PhenoCVeg",
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
										"U_Phase": "PhenoCVeg",
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
									"U_Phase": "PhenoCVeg",
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
			} else if (changePhase == "Flower") {
				$.each(sItems, function (i, e) {
					sObj = table.getContextByIndex(e).getObject();
					var payLoadFloInventoryEntry = {
						U_Phase: "PhenoFlower",
						//U_FlowerDate: changeDate, //"20230115", <Selected Date in format --> YYYYMMDD>
					};
					batchUrl.push({
						url: "/b1s/v2/BatchNumberDetails(" + sObj.AbsEntry + ")",
						data: payLoadFloInventoryEntry,
						method: "PATCH"
					});
				});
			}

			jsonModel.setProperty("/errorTxt", []);
			this.createBatchCall(batchUrl, function () {
				var errorTxt = jsonModel.getProperty("/errorTxt");
				if (errorTxt.length > 0) {
					sap.m.MessageBox.error(errorTxt.join("\n"));
				} else {
					sap.m.MessageToast.show("Selected plants are moved to " + changePhase);
				}
				that.CloneChangeGrowthPhaseDialog.close();
				that.CloneChangeGrowthPhaseDialog.setBusy(false);
				that.clearData();
				that.loadStrainData();
				that.byId("clonePlannerTable").setSelectedIndex(-1);
			}, this.CloneChangeGrowthPhaseDialog);
		},
		/*method for change growth phase in propagation tab end*/

		/*code for mark as propagation start*/
		markAsClones: function () {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			//var markAsMotherList = jsonModel.getProperty("/markAsMotherList");
			//var locationID = markAsMotherList[0].key;
			var sItems;
			var phenoTracktable = this.getView().byId("clonePlannerTable");
			sItems = phenoTracktable.getSelectedIndices();
			if (sItems.length > 0) {
				//var updateObject = phenoTracktable.getContextByIndex(sItems[0]).getObject();
				sap.m.MessageBox.confirm("Are you sure you want to mark selected cuttings as clones and move to Propagation ?", {
					onClose: function (action) {
						if (action === "OK") {
							var sObj, batchUrl = [];
							$.each(sItems, function (i, e) {
								sObj = phenoTracktable.getContextByIndex(e).getObject();
								var payLoadInventoryEntry = {
									U_Phase: "PhenoClone"
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
									sap.m.MessageToast.show("Selected plants are marked as clones");
								}
								that.loadStrainData();
								phenoTracktable.setSelectedIndex(-1);
							});
						}
					}
				});
			} else {
				sap.m.MessageToast.show("Please select atleast one plant");
			}
		},

		/****method for change location start********/
		changeLocation: function () {
			var sItems, updateObject;
			var table = this.getView().byId("clonePlannerTable");
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			sItems = table.getSelectedIndices();
			if (sItems.length > 0) {
				updateObject = table.getContextByIndex(sItems[0]).getObject();
				if (!this.changeLocationDialog) {
					this.changeLocationDialog = sap.ui.xmlfragment("changeLocationDialog", "com.9b.PhenoTrack.view.fragments.ChangeLocation", this);
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
			var table = this.getView().byId("clonePlannerTable");
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
					that.byId("clonePlannerTable").setSelectedIndex(-1);
				}, this.changeLocationDialog);
			}
		},
		/****method for change location end********/

		onFilterTable: function (evt) {
			var customData = evt.getParameter("column").getLabel().getCustomData();
			if (customData.length > 0 && customData[0].getKey() === "DAYS") {
				var sValue = evt.getParameter("value");
				var filters = [new sap.ui.model.Filter("Quantity", "EQ", sValue)];
				this.byId("clonePlannerTable").getBinding("rows").filter(filters);
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
			this.byId("clonePlannerTable").getBinding("rows").filter(andFilter);
		},
		renderComplete: function (evt) {
			if (evt.getSource().getParent().getParent().getFullScreen() === false) {
				evt.getSource().setHeight("8rem");
			}
		},
		onRefreshChart: function () {
			this.byId("clonePlannerTable").setSelectedIndex(-1);
		},

		onCloseRefreshChart: function () {
			this.byId("searchFieldTable4").setText("");
			this.byId("searchFieldTable3").setVisible(false);
			var cloneTable = this.byId("clonePlannerTable");
			// var cloneList = this.byId("oList");
			cloneTable.getBinding("rows").filter([]);
			//cloneList.getBinding("items").filter([]);
		},
		clearData: function () {
			this.byId("clonePlannerTable").clearSelection();
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
			var table = this.getView().byId("clonePlannerTable");
			sItems = table.getSelectedIndices();
		}

	});
});