(function ($, document, machine) {

    const Item = ({ item, onDelete }) => (
        <tr key={item.employee_code} id={item.employee_code}>
            <td>{item.fullname}</td>
            <td>{item.organization}</td>
            <td>{item.employee_code}</td>
            <td>{item.vg_code}</td>
            <td>{item.email}</td>
            <td><span className="delete" title="Delete" onClick={() => onDelete(text)}><i className="fa fa-minus-circle" /></span></td>
        </tr>);

    const CandidateList = ({ items, onDelete }) => {

        return (
            <table className="item-list">
                <thead>
                    <tr>
                        <th>Họ và tên</th>
                        <th>Công ty</th>
                        <th>Mã NV</th>
                        <th>Mã VG</th>
                        <th>Email</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, i) => <Item item={item} key={i} onDelete={onDelete} />)}
                </tbody>
            </table>
        );
    };

    const ImportButton = ({ onChange = () => { } }) => {

        function processData(allText) {
            const allTextLines = Array.isArray(allText) ? allText : allText.split(/\r\n|\n/);
            const headers = allTextLines[0].split(',');
            const lines = [];

            for (let i = 1; i < allTextLines.length; i++) {
                const data = allTextLines[i].split(',');
                if (data.length === headers.length) {

                    const tarr = [];
                    for (let j = 0; j < headers.length; j++) {
                        tarr.push(data[j]);
                    }
                    lines.push(tarr);
                } else {
                    alert('Nội dung file sai định dạng!')
                    break;
                }
            }
            return { headers, lines };
        }

        const onFileChange = (e) => {

            const files = e.target.files;
            const reader = new FileReader();

            // Closure to capture the file information.
            reader.onload = function (e) {
                const content = e.target.result;
                const data = processData(content);
                machine.addCandidates(data.lines)
                // data.lines.forEach((line) => {
                //     machine.addCandidate(line.join('\t'));
                // });
                onChange && onChange(data.lines)
            };

            reader.readAsText(files[0]);
        };

        return (
            <label className={"btn positive-btn"} htmlFor={"file-input"}>
                <i className="fa fa-upload" /> Nhập từ file CSV
                <input type={"file"} style={{ display: 'none' }} id={"file-input"} onChange={onFileChange} />
            </label>
        )
    };

    class InputForm extends React.Component {

        constructor(props) {
            super(props);
            this.handleAdd = this.handleAdd.bind(this);
            this.handleChangeNumberOfDraws = this.handleChangeNumberOfDraws.bind(this);
            this.handleChangeFontSize = this.handleChangeFontSize.bind(this);
            this.state = {
                items: [],
                candidate: undefined,
                inputFullname: "",
                inputOrganization: "",
                inputEmployeeCode: "",
                inputVGCode: "",
                inputEmail: "",
                isWithoutReplacement: false,
                numberOfDraws: 1,
                fontSize: 24
            }
        }

        componentDidMount() {
            this.getConfig();

            machine.onSettingChange((settings) => {

                this.setState({
                    ...settings
                });
            });

            machine.registerCandidatesUpdateHandler((candidates) => {
                this.setState({
                    items: candidates
                });
            });
        }

        getConfig() {
            let password = this.state.password;
            const isShowEditListView = false;
            const currentUrl = new URL(window.location.href);
            const token = currentUrl.searchParams.get('token');
            console.log('token', token)
            if (!token || !token.length) {
                password = prompt("Vui lòng nhập mật khẩu quản trị!");
            }
            return fetch(`/api/configs${token ? '?token='+token : ''}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': password,
                }
            })
                .then((res) => res.json())
                .then((result) => {
                    if (result.error) {
                        return alert(result.message)
                    }
                    this.setState({
                        items: result.candidates || [],
                        candidate: result.candidate,
                        isWithoutReplacement: result.isWithoutReplacement,
                        numberOfDraws: result.numberOfDraws,
                        fontSize: result.fontSize,
                        password,
                    }, () => {
                        if (!token || !token.length) {
                            window.showEditListView();
                        }
                        machine.onResultChange((poorMan) => {

                            // TODO convert these to React style
                            $('.main-container').removeClass('show animated fadeOutUp');
                            $('.main-container').addClass('hide');
                            $('#result-view-container').addClass('show animated fadeInDown');

                            const container = $('#winner-container').empty();
                            poorMan.forEach(() => {
                                container.append($("<h1>", {
                                    class: "winner masked",
                                    css: {
                                        'font-size': this.state.fontSize + 'px',
                                        'min-height': this.state.fontSize
                                    }
                                }));
                            });
                            $('#save-result').off('click.save').on('click.save', () => {
                                let blob = new Blob([poorMan.join('\n')], { type: "text/plain;charset=utf-8" });
                                saveAs(blob, "result.txt");
                            });

                            let count = 0;

                            const t = setInterval(function () {

                                $('.winner.masked:first').removeClass('masked')
                                    .append($("<span>", {
                                        class: "fa fa-trophy"
                                    }))
                                    .append($("<span>").html(typeof poorMan[count] === 'string' ? poorMan[count] :
                                        ` <strong>Người nhận quà<strong><br/>
                                Họ tên: ${poorMan[count].fullname}<br/>
                                Công ty: ${poorMan[count].organization}<br/>
                                Mã nhân viên: ${poorMan[count].employee_code}<br/>
                                Mã VG: ${poorMan[count].vg_code}<br/>
                                Email: ${poorMan[count].email}<br/>
                                `));
                                count++;
                                if (count === poorMan.length) {
                                    clearInterval(t);
                                }
                            }, 1000);
                        });
                    })
                });

        }

        handleChange(name) {
            return (e) => {
                this.setState({
                    [name]: e.target.value
                })
            }
        }

        handleChangeNumberOfDraws(e) {
            const v = e.target.value;
            this.setState({
                numberOfDraws: v
            }, () => {
                if (!isNaN(v)) {

                    machine.setSettings({ numberOfDraws: +v });
                }
            })
        }

        handleChangeFontSize(e) {
            const v = e.target.value;
            this.setState({
                fontSize: v
            }, () => {
                if (!isNaN(v)) {

                    machine.setSettings({ fontSize: +v });
                }
            })
        }

        handleAdd(e) {
            e.preventDefault();
            const {
                inputFullname,
                inputOrganization,
                inputEmployeeCode,
                inputVGCode,
                inputEmail
            } = this.state;
            if (!inputFullname || !inputOrganization || !inputEmployeeCode || !inputVGCode || !inputEmail) {
                return alert('Vui lòng nhập đầy đủ thông tin người chơi!')
            }
            machine.addCandidate([
                inputFullname,
                inputOrganization,
                inputEmployeeCode,
                inputVGCode,
                inputEmail
            ]);
            this.setState({
                inputFullname: "",
                inputOrganization: "",
                inputEmployeeCode: "",
                inputVGCode: "",
                inputEmail: "",
            })
        }

        handleDelete(val) {
            machine.removeCandidate(val);
        }

        handleDeleteAll() {

            machine.clearCandidates();
        }

        handleInputDone(e) {
            $('.main-container').removeClass('show animated fadeOutUp');
            $('.main-container').addClass('hide');
            $('#start-view-container').addClass('show animated fadeInDown');
        }

        setWithoutReplacement() {
            machine.setSettings({ isWithoutReplacement: $('#rand-without-replacement').is(':checked') });
        }

        onFileChange = (itemArray) => {

        }

        render() {

            return (
                <div>
                    <h1>Chỉnh sửa danh sách người chơi</h1>
                    <form id="edit-item-form" onSubmit={this.handleAdd}>
                        <input value={this.state.inputFullname} type="text" placeholder="Họ và Tên" id="new-candidate-fullname"
                            onChange={this.handleChange('inputFullname')} />
                        <input value={this.state.inputOrganization} type="text" placeholder="Công ty" id="new-candidate-organization"
                            onChange={this.handleChange('inputOrganization')} />
                        <input value={this.state.inputEmployeeCode} type="text" placeholder="Mã nhân viên" id="new-candidate-employee-code"
                            onChange={this.handleChange('inputEmployeeCode')} />
                        <input value={this.state.inputVGCode} type="text" placeholder="Mã VG" id="new-candidate-vg-code"
                            onChange={this.handleChange('inputVGCode')} />
                        <input value={this.state.inputEmail} type="text" placeholder="Email" id="new-candidate-email"
                            onChange={this.handleChange('inputEmail')} />
                        <div className={"btn-set inline-block"}>
                            <button className="btn positive-btn" title="Thêm" onClick={this.handleAdd}>
                                <i className="fa fa-plus"></i> {'Thêm người chơi'}
                            </button>
                            <ImportButton onFileChange={this.onFileChange} />
                        </div>
                        <div className="item-list-container">
                            <h2>Danh sách người chơi</h2>
                            <CandidateList items={this.state.items} onDelete={this.handleDelete} />
                            <div className="text-right float-right">
                                <a className="delete-all" onClick={this.handleDeleteAll}>
                                    <i className="fa fa-times"></i>
                                    Xóa tất cả
                                </a>
                            </div>
                            <div style={{ marginBottom: 16, marginTop: 16 }}>
                                <label className={"block"} style={{ marginBottom: 2 }}>Số lần quay trong một lần chơi</label>
                                <input value={this.state.numberOfDraws} type="number" placeholder="Number Of Draws" id="number-of-draws"
                                    onChange={this.handleChangeNumberOfDraws} min={1} max={Math.max(this.state.items.length, 1)} />
                            </div>
                            <div style={{ marginBottom: 16, marginTop: 16 }}>
                                <label className={"block"} style={{ marginBottom: 2 }}>Cỡ chữ (pixel)</label>
                                <input value={this.state.fontSize} type="number" placeholder="Font Size (in pixel)" id="font-size"
                                    onChange={this.handleChangeFontSize} />
                            </div>
                            <label htmlFor="rand-without-replacement" className="text-left">
                                <input checked={!!this.state.isWithoutReplacement} onChange={this.setWithoutReplacement} type="checkbox"
                                    id="rand-without-replacement" name="without-replacement" />
                                Bỏ kết quả quay được ở lượt quay của người khác
                            </label>
                        </div>
                        <div className="btn-set">
                            <button className="btn primary-btn btn-done" onClick={this.handleInputDone}>Xong</button>
                        </div>
                    </form>
                </div>
            );
        }
    }

    ReactDOM.render(
        <InputForm items={[]} />, document.querySelector('#edit-item-container')
    );
})(jQuery, document, window.machine);
